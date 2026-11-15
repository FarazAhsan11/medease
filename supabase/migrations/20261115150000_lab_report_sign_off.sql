-- MedEase: report sign-off (LAB-17). Safe to run more than once. Run after the
-- sample tracking migration (20261115120000_lab_samples.sql).
--
-- An uploaded report waits until a staff member with sign-off rights approves
-- it. Only then does the patient (and the ordering doctor) see it: the app
-- stamps the signer's name, qualification and time on every page of the PDF,
-- and sign_off_lab_report releases that stamped copy and moves the booking to
-- report ready. A signer can send a report back with a note instead; the
-- booking then waits for a new upload. Lab technicians upload but don't sign.
-- Design: docs/lab-reports.md.

-- Roles: technicians, and who signs -------------------------------------------------

alter table public.lab_members drop constraint if exists lab_members_role_check;
alter table public.lab_members add constraint lab_members_role_check
  check (role in ('admin', 'front_desk', 'collector', 'technician', 'pathologist'));

-- The roles an admin can give. One list, used by every staff function.
create or replace function private.is_lab_staff_role(p_role text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_role in ('front_desk', 'collector', 'technician', 'pathologist'), false);
$$;

revoke execute on function private.is_lab_staff_role(text) from public;

-- reports.sign: release a report to the patient (pathologists; the admin too,
-- once they have sign-off details). Technicians do everything a pathologist
-- does but sign. src/features/lab-staff/lib/lab-permissions.ts repeats this.
create or replace function private.lab_role_can(p_role text, p_permission text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'admin' then p_permission is not null
    when 'front_desk' then p_permission in (
      'bookings.view', 'bookings.view_all', 'bookings.collect',
      'bookings.assign', 'bookings.cancel', 'reports.view'
    )
    when 'collector' then p_permission in ('bookings.view', 'bookings.collect')
    when 'technician' then p_permission in (
      'bookings.view', 'bookings.view_all', 'bookings.process', 'reports.view',
      'reports.publish'
    )
    when 'pathologist' then p_permission in (
      'bookings.view', 'bookings.view_all', 'bookings.process', 'reports.view',
      'reports.publish', 'reports.sign'
    )
    else false
  end;
$$;

-- The name and qualification printed on a report the person signs off, as the
-- lab admin enters them: the lab vouches for its signers, so people can't set
-- their own. Latin letters only, because the stamp uses a standard PDF font.
alter table public.lab_members add column if not exists signer_name text;
alter table public.lab_members add column if not exists signer_title text;

alter table public.lab_members drop constraint if exists lab_members_signer_check;
alter table public.lab_members add constraint lab_members_signer_check
  check (
    (signer_name is null) = (signer_title is null)
    and (signer_name is null or (
      char_length(signer_name) between 2 and 80
      and char_length(signer_title) between 2 and 120
      and signer_name ~ '^[\x20-\x7e -ÿ]+$'
      and signer_title ~ '^[\x20-\x7e -ÿ]+$'
      and btrim(signer_name) = signer_name
      and btrim(signer_title) = signer_title
    ))
  );

-- Inviting, changing roles and inviting back take the new role. As in LAB-07
-- (20261113150000_lab_staff.sql) apart from the role check.

create or replace function public.add_lab_staff(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('staff');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if not private.is_lab_staff_role(p_role) then
    raise exception 'invalid_role';
  end if;

  -- One invite at a time per lab, so the count holds.
  perform 1 from public.lab_profiles where id = v_lab_id for update;

  if (
    select count(*) from public.lab_members
    where lab_id = v_lab_id and status <> 'removed' and role <> 'admin'
  ) >= 50 then
    raise exception 'staff_limit';
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and u.raw_app_meta_data ->> 'role' = 'lab'
      and u.email_confirmed_at is null
      and u.last_sign_in_at is null
      and u.created_at > now() - interval '10 minutes'
  ) or exists (
    select 1 from public.lab_members where user_id = p_user_id
  ) then
    raise exception 'invalid_user';
  end if;

  insert into public.lab_members (user_id, lab_id, role, status, invited_by)
  values (p_user_id, v_lab_id, p_role, 'invited', auth.uid());

  perform private.write_audit(
    'lab.staff_invited', 'user', p_user_id, jsonb_build_object('lab_id', v_lab_id)
  );
end;
$$;

create or replace function public.set_lab_staff_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('staff');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if not private.is_lab_staff_role(p_role) then
    raise exception 'invalid_role';
  end if;

  -- A role that can't sign drops the details, so a later promotion starts
  -- from details the admin enters again.
  update public.lab_members
  set role = p_role,
      signer_name = case
        when private.lab_role_can(p_role, 'reports.sign') then signer_name
      end,
      signer_title = case
        when private.lab_role_can(p_role, 'reports.sign') then signer_title
      end
  where user_id = p_user_id
    and lab_id = v_lab_id
    and role <> 'admin'
    and status <> 'removed';

  if not found then
    raise exception 'member_not_found';
  end if;

  perform private.write_audit(
    'lab.staff_role_changed', 'user', p_user_id,
    jsonb_build_object('lab_id', v_lab_id, 'role', p_role)
  );
end;
$$;

create or replace function public.restore_lab_staff(p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('staff');
  v_user_id uuid;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if not private.is_lab_staff_role(p_role) then
    raise exception 'invalid_role';
  end if;

  perform 1 from public.lab_profiles where id = v_lab_id for update;

  select m.user_id into v_user_id
  from public.lab_members m
  join auth.users u on u.id = m.user_id
  where m.lab_id = v_lab_id
    and m.status = 'removed'
    and u.email = lower(btrim(p_email))
  for update of m;

  if v_user_id is null then
    return null;
  end if;

  if (
    select count(*) from public.lab_members
    where lab_id = v_lab_id and status <> 'removed' and role <> 'admin'
  ) >= 50 then
    raise exception 'staff_limit';
  end if;

  update public.lab_members
  set status = 'invited',
      role = p_role,
      invited_by = auth.uid(),
      created_at = now(),
      activated_at = null,
      removed_at = null,
      removed_by = null
  where user_id = v_user_id;

  perform private.write_audit(
    'lab.staff_invited', 'user', v_user_id,
    jsonb_build_object('lab_id', v_lab_id, 'again', true)
  );

  return v_user_id;
end;
$$;

-- The admin sets or clears a signer's details: their own or a member's whose
-- role signs. Reports already signed keep the details they were signed with.
create or replace function public.save_lab_signer(
  p_user_id uuid,
  p_name text,
  p_title text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('staff');
  v_role text;
  v_name text := nullif(btrim(p_name), '');
  v_title text := nullif(btrim(p_title), '');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  select role into v_role
  from public.lab_members
  where user_id = p_user_id and lab_id = v_lab_id and status <> 'removed'
  for update;

  if not found then
    raise exception 'member_not_found';
  end if;
  if not private.lab_role_can(v_role, 'reports.sign') then
    raise exception 'cannot_sign';
  end if;
  if (v_name is null) <> (v_title is null) then
    raise exception 'invalid_signer';
  end if;

  begin
    update public.lab_members
    set signer_name = v_name,
        signer_title = v_title
    where user_id = p_user_id;
  exception when check_violation then
    raise exception 'invalid_signer';
  end;

  perform private.write_audit(
    'lab.signer_saved', 'user', p_user_id,
    jsonb_build_object('lab_id', v_lab_id, 'cleared', v_name is null)
  );
end;
$$;

revoke execute on function public.save_lab_signer(uuid, text, text) from public, anon;
grant execute on function public.save_lab_signer(uuid, text, text) to authenticated;

-- The admin's staff list, now with sign-off details. Latest version before
-- this: 20261113150000_lab_staff.sql.
drop function if exists public.get_lab_staff();

create or replace function public.get_lab_staff()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  status text,
  invited_at timestamptz,
  activated_at timestamptz,
  invite_expires_at timestamptz,
  signer_name text,
  signer_title text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('staff');
begin
  return query
  select
    m.user_id,
    u.raw_user_meta_data ->> 'full_name',
    u.email::text,
    m.role,
    m.status,
    m.created_at,
    m.activated_at,
    (
      select max(t.expires_at) from public.auth_tokens t
      where t.user_id = m.user_id
        and t.purpose = 'lab_invite'
        and t.used_at is null
    ),
    m.signer_name,
    m.signer_title
  from public.lab_members m
  join auth.users u on u.id = m.user_id
  where m.lab_id = v_lab_id and m.status <> 'removed'
  order by m.role = 'admin' desc, m.created_at;
end;
$$;

revoke execute on function public.get_lab_staff() from public, anon;
grant execute on function public.get_lab_staff() to authenticated;

-- Reports wait for sign-off ---------------------------------------------------------
-- released_at: when the patient could first open it. Set by sign-off, and for
-- reports published before sign-off existed, their upload time.
-- storage_path is the file people open: the upload until sign-off, then the
-- stamped copy; original_storage_path keeps the upload as the lab sent it.
-- A report sent back is replaced without ever being released.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lab_reports'
      and column_name = 'released_at'
  ) then
    alter table public.lab_reports add column released_at timestamptz;
    -- Every report so far reached the patient when it was uploaded.
    update public.lab_reports set released_at = created_at;
  end if;
end;
$$;

alter table public.lab_reports add column if not exists signed_off_by uuid;
alter table public.lab_reports add column if not exists signer_name text;
alter table public.lab_reports add column if not exists signer_title text;
alter table public.lab_reports add column if not exists original_storage_path text;
alter table public.lab_reports add column if not exists returned_at timestamptz;
alter table public.lab_reports add column if not exists returned_by uuid;
alter table public.lab_reports add column if not exists return_note text;

alter table public.lab_reports drop constraint if exists lab_reports_signed_off_check;
alter table public.lab_reports add constraint lab_reports_signed_off_check
  check (
    signed_off_by is null
    or (
      released_at is not null
      and signer_name is not null
      and signer_title is not null
      and original_storage_path is not null
    )
  );

alter table public.lab_reports drop constraint if exists lab_reports_returned_check;
alter table public.lab_reports add constraint lab_reports_returned_check
  check (
    (returned_at is null) = (returned_by is null)
    and (returned_at is null) = (return_note is null)
    and (returned_at is null or (replaced_at is not null and released_at is null))
    and (return_note is null or char_length(return_note) between 1 and 500)
  );

-- What people read. Signers' and returners' ids stay with the lab's history;
-- the patient's screens read the name copied at sign-off.
revoke select on public.lab_reports from authenticated;
grant select (
  id, booking_id, lab_id, patient_id, care_recipient_id, version, storage_path,
  uploaded_by, created_at, replaced_at, ordering_doctor_id, released_at,
  signer_name, signer_title, returned_at, return_note
) on public.lab_reports to authenticated;

-- The patient and the ordering doctor read only released reports. The lab reads
-- every row (LAB-07's policy), to sign off or send back.
drop policy if exists "Patients read their lab reports" on public.lab_reports;
create policy "Patients read their lab reports" on public.lab_reports
  for select to authenticated
  using (patient_id = (select auth.uid()) and released_at is not null);

drop policy if exists "Ordering doctors read their reports" on public.lab_reports;
create policy "Ordering doctors read their reports" on public.lab_reports
  for select to authenticated
  using (ordering_doctor_id = (select auth.uid()) and released_at is not null);

-- The patient's records and the lab's recent reports, latest released first;
-- the lab's reports waiting for sign-off, oldest first.
drop index if exists public.lab_reports_patient_idx;
drop index if exists public.lab_reports_lab_idx;
create index if not exists lab_reports_patient_released_idx
  on public.lab_reports (patient_id, released_at desc)
  where replaced_at is null and released_at is not null;
create index if not exists lab_reports_lab_released_idx
  on public.lab_reports (lab_id, released_at desc)
  where replaced_at is null and released_at is not null;
create index if not exists lab_reports_to_sign_idx
  on public.lab_reports (lab_id, created_at)
  where replaced_at is null and released_at is null;

-- Report ready means a released report. Latest version before this:
-- 20261109180000_lab_reports.sql.
create or replace function private.require_lab_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.lab_reports
    where booking_id = new.id
      and replaced_at is null
      and released_at is not null
  ) then
    raise exception 'report_required';
  end if;
  return new;
end;
$$;

-- The ordering doctor gets the report when it's released, not when it's
-- uploaded. Latest version before this: 20261112150000_lab_order_results.sql.
create or replace function private.route_lab_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
begin
  if new.released_at is null
    or (tg_op = 'UPDATE' and old.released_at is not null) then
    return new;
  end if;

  select o.doctor_id, o.appointment_id
    into new.ordering_doctor_id, v_appointment_id
  from public.lab_bookings b
  join public.lab_orders o on o.id = b.lab_order_id
  where b.id = new.booking_id;

  if new.ordering_doctor_id is not null then
    perform private.notify(
      new.ordering_doctor_id,
      'lab_result_ready',
      '/doctor/appointments/' || v_appointment_id || '/lab-tests'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists route_lab_report on public.lab_reports;
create trigger route_lab_report
  before insert or update of released_at on public.lab_reports
  for each row execute function private.route_lab_report();

-- A booking that leaves processing other than by sign-off (a new sample is
-- needed, or it's cancelled) sets aside the report waiting for sign-off, so
-- it can't be signed later or block the next upload.
create or replace function private.retire_pending_lab_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lab_reports
  set replaced_at = now()
  where booking_id = new.id
    and replaced_at is null
    and released_at is null;
  return null;
end;
$$;

revoke execute on function private.retire_pending_lab_report() from public;
revoke execute on function private.route_lab_report() from public;
revoke execute on function private.require_lab_report() from public;

drop trigger if exists retire_pending_lab_report on public.lab_bookings;
create trigger retire_pending_lab_report
  after update of status on public.lab_bookings
  for each row
  when (old.status = 'processing' and new.status not in ('processing', 'report_ready'))
  execute function private.retire_pending_lab_report();

-- Notices ----------------------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'appointment_booked', 'appointment_new', 'appointment_cancelled',
    'appointment_reminder', 'prescription_issued', 'prescription_updated',
    'prescription_cancelled', 'verification_approved',
    'verification_needs_info', 'verification_rejected',
    'visit_summary_ready', 'visit_summary_updated',
    'lab_booking_booked', 'lab_booking_new',
    'lab_booking_sample_collected', 'lab_booking_processing',
    'lab_booking_report_ready', 'lab_booking_recollection_needed',
    'lab_booking_cancelled', 'lab_booking_rescheduled',
    'lab_booking_refunded', 'lab_booking_payment_expired',
    'lab_order_issued', 'lab_order_updated', 'lab_order_cancelled',
    'lab_result_ready', 'lab_result_comment',
    'lab_booking_assigned', 'lab_booking_unassigned',
    'lab_report_to_sign', 'lab_report_returned'
  ));

-- Uploading -------------------------------------------------------------------------
-- As in LAB-07, but the report waits for sign-off and the booking stays in
-- processing. The signers are told, unless the uploader signs it straight away
-- (p_notify_signers false). Latest version before this:
-- 20261113150000_lab_staff.sql.

-- A report file goes in only at a fresh path in its booking's folder, and only
-- once the server has checked it (verifyUpload or the stamp) and recorded it.
-- Claiming the record means a file is used once.
create or replace function private.claim_lab_report_upload(
  p_lab_id uuid,
  p_booking_id uuid,
  p_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_path is null or p_path !~ (
    '^' || p_lab_id::text || '/' || p_booking_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  ) then
    raise exception 'invalid_path';
  end if;

  delete from private.checked_uploads
  where bucket = 'lab-reports'
    and path = p_path
    and owner_id = p_lab_id;
  if not found then
    raise exception 'upload_not_checked';
  end if;
end;
$$;

revoke execute on function private.claim_lab_report_upload(uuid, uuid, text) from public;

drop function if exists public.publish_lab_report(uuid, text);

create or replace function public.publish_lab_report(
  p_booking_id uuid,
  p_path text,
  p_notify_signers boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('reports.publish');
  v_booking public.lab_bookings;
  v_version integer;
  v_report_id uuid;
begin
  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and lab_id = v_lab_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  -- Only a booking being processed; once signed off it's report ready.
  if v_booking.status <> 'processing' then
    raise exception 'status_changed';
  end if;

  -- One report waits at a time: a signer sends it back before another goes up.
  if exists (
    select 1 from public.lab_reports
    where booking_id = v_booking.id and replaced_at is null
  ) then
    raise exception 'report_awaiting_sign_off';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.lab_reports
  where booking_id = v_booking.id;
  if v_version > 20 then
    raise exception 'too_many_versions';
  end if;

  perform private.claim_lab_report_upload(v_lab_id, v_booking.id, p_path);

  insert into public.lab_reports (
    booking_id, lab_id, patient_id, care_recipient_id, version, storage_path,
    uploaded_by
  ) values (
    v_booking.id, v_booking.lab_id, v_booking.patient_id,
    v_booking.care_recipient_id, v_version, p_path, auth.uid()
  )
  returning id into v_report_id;

  if coalesce(p_notify_signers, true) then
    perform private.notify_lab(
      v_lab_id, 'lab_report_to_sign', '/lab/reports', 'reports.sign'
    );
  end if;

  perform private.write_audit(
    'lab_report.uploaded', 'lab_booking', v_booking.id,
    jsonb_build_object('report_id', v_report_id)
  );

  return v_report_id;
end;
$$;

revoke execute on function public.publish_lab_report(uuid, text, boolean) from public, anon;
grant execute on function public.publish_lab_report(uuid, text, boolean) to authenticated;

-- Signing off --------------------------------------------------------------------------
-- The app has stamped the signer's details on a copy of the upload, stored it
-- in the booking's folder and recorded it as checked, and passes the details
-- it stamped. This releases that copy with those details, refusing if the
-- admin changed them meanwhile so the record and the file agree, and moves the
-- booking to report ready, which tells the patient and adds the step, by the
-- signer, to the history. The booking is locked before the report, the order
-- a status move takes them in, so the two can't deadlock; the report lock
-- stops two signers both signing it.

drop function if exists public.sign_off_lab_report(uuid, text);

create or replace function public.sign_off_lab_report(
  p_report_id uuid,
  p_signed_path text,
  p_signer_name text,
  p_signer_title text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('reports.sign');
  v_signer public.lab_members;
  v_booking_id uuid;
  v_report public.lab_reports;
  v_booking public.lab_bookings;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  select * into v_signer from public.lab_members where user_id = auth.uid();
  if v_signer.signer_name is null then
    raise exception 'signer_details_missing';
  end if;
  if v_signer.signer_name is distinct from p_signer_name
    or v_signer.signer_title is distinct from p_signer_title then
    raise exception 'signer_details_changed';
  end if;

  select booking_id into v_booking_id
  from public.lab_reports
  where id = p_report_id and lab_id = v_lab_id;
  if not found then
    raise exception 'report_not_found';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = v_booking_id
  for update;

  select * into v_report
  from public.lab_reports
  where id = p_report_id
  for update;

  if v_report.replaced_at is not null or v_report.released_at is not null then
    raise exception 'report_not_pending';
  end if;
  if v_booking.status <> 'processing' then
    raise exception 'status_changed';
  end if;

  if p_signed_path = v_report.storage_path then
    raise exception 'invalid_path';
  end if;
  perform private.claim_lab_report_upload(v_lab_id, v_booking.id, p_signed_path);

  update public.lab_reports
  set original_storage_path = storage_path,
      storage_path = p_signed_path,
      signed_off_by = auth.uid(),
      signer_name = v_signer.signer_name,
      signer_title = v_signer.signer_title,
      released_at = now()
  where id = v_report.id;

  update public.lab_bookings
  set status = 'report_ready',
      status_reason = null,
      status_note = null,
      status_changed_at = now()
  where id = v_booking.id;

  perform private.write_audit(
    'lab_report.signed_off', 'lab_booking', v_booking.id,
    jsonb_build_object('report_id', v_report.id)
  );
end;
$$;

revoke execute on function public.sign_off_lab_report(uuid, text, text, text) from public, anon;
grant execute on function public.sign_off_lab_report(uuid, text, text, text) to authenticated;

-- Telling the signers later --------------------------------------------------------------
-- An uploader who ticked "sign it off now" uploads without notifying the other
-- signers. If their sign-off then fails, this tells the signers after all.
-- Only for the caller's own upload while it's still waiting.

create or replace function public.announce_lab_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('reports.publish');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  if not exists (
    select 1 from public.lab_reports
    where id = p_report_id
      and lab_id = v_lab_id
      and uploaded_by = auth.uid()
      and replaced_at is null
      and released_at is null
  ) then
    raise exception 'report_not_pending';
  end if;

  perform private.notify_lab(
    v_lab_id, 'lab_report_to_sign', '/lab/reports', 'reports.sign'
  );
end;
$$;

revoke execute on function public.announce_lab_report(uuid) from public, anon;
grant execute on function public.announce_lab_report(uuid) to authenticated;

-- Sending back -------------------------------------------------------------------------
-- A signer finds a mistake: the report is set aside with a note for the lab
-- (never shown to the patient), the uploader is told, and the booking waits
-- for a new upload. The file stays, as the lab's record.

create or replace function public.return_lab_report(
  p_report_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('reports.sign');
  v_note text := nullif(btrim(regexp_replace(coalesce(p_note, ''), '\r\n?', E'\n', 'g')), '');
  v_report public.lab_reports;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if v_note is null or char_length(v_note) > 500 then
    raise exception 'invalid_note';
  end if;

  select * into v_report
  from public.lab_reports
  where id = p_report_id and lab_id = v_lab_id
  for update;

  if not found then
    raise exception 'report_not_found';
  end if;
  if v_report.replaced_at is not null or v_report.released_at is not null then
    raise exception 'report_not_pending';
  end if;

  update public.lab_reports
  set replaced_at = now(),
      returned_at = now(),
      returned_by = auth.uid(),
      return_note = v_note
  where id = v_report.id;

  -- The uploader, if they're still here and it isn't their own report.
  if v_report.uploaded_by is distinct from auth.uid() and exists (
    select 1 from public.lab_members m
    where m.user_id = v_report.uploaded_by
      and m.lab_id = v_lab_id
      and m.status = 'active'
  ) then
    perform private.notify(v_report.uploaded_by, 'lab_report_returned', '/lab/reports');
  end if;

  perform private.write_audit(
    'lab_report.returned', 'lab_booking', v_report.booking_id,
    jsonb_build_object('report_id', v_report.id)
  );
end;
$$;

revoke execute on function public.return_lab_report(uuid, text) from public, anon;
grant execute on function public.return_lab_report(uuid, text) to authenticated;

-- What the doctor sees on a visit's lab tests --------------------------------------------
-- As in PRC-11, but only a released report, dated when it was released. Latest
-- version before this: 20261113120000_lab_results_inbox.sql.

create or replace function public.get_lab_order_bookings(p_appointment_id uuid)
returns table (
  booking_id uuid,
  lab_name text,
  status text,
  collection text,
  visit_date date,
  slot_starts_at timestamptz,
  timezone text,
  ordered_test_ids text[],
  report_id uuid,
  report_published_at timestamptz,
  comment text,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  return query
  select
    b.id,
    b.lab_name,
    b.status,
    b.collection,
    b.visit_date,
    b.slot_starts_at,
    b.timezone,
    b.ordered_test_ids,
    r.id,
    r.released_at,
    v.comment,
    r.reviewed_at
  from public.lab_orders o
  join public.lab_bookings b on b.lab_order_id = o.id
  left join public.lab_reports r
    on r.booking_id = b.id
    and r.replaced_at is null
    and r.released_at is not null
  left join public.lab_result_reviews v on v.booking_id = b.id
  where o.appointment_id = p_appointment_id
    and o.doctor_id = v_uid
    and b.status <> 'cancelled'
  order by b.created_at;
end;
$$;

-- The doctor's results inbox ------------------------------------------------------------
-- As in PRC-11, but dated, ordered and paged by release, not upload: a report
-- signed off days after it went up joins the to-review list where it belongs,
-- and the cursor can't skip it. A report gets its ordering doctor only on
-- release (route_lab_report), so released_at is set on every row here and the
-- count keeps using the same index. Latest version before this:
-- 20261113120000_lab_results_inbox.sql.

drop index if exists public.lab_reports_to_review_idx;
create index if not exists lab_reports_to_review_idx
  on public.lab_reports (ordering_doctor_id, released_at, id)
  where ordering_doctor_id is not null
    and replaced_at is null
    and reviewed_at is null;

create or replace function public.get_lab_results_inbox(
  p_reviewed boolean,
  p_cursor_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 25
)
returns table (
  report_id uuid,
  booking_id uuid,
  appointment_id uuid,
  patient_name text,
  care_recipient_name text,
  care_recipient_relation text,
  lab_name text,
  collection text,
  visit_date date,
  timezone text,
  priority text,
  test_names text[],
  published_at timestamptz,
  version integer,
  reviewed_at timestamptz,
  comment text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_ids uuid[];
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if p_reviewed is null or (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception 'invalid_cursor';
  end if;

  -- The page's report ids, read from the list's index alone.
  if p_reviewed then
    select array_agg(s.id order by s.reviewed_at desc, s.id desc) into v_ids
    from (
      select r.id, r.reviewed_at
      from public.lab_reports r
      where r.ordering_doctor_id = v_uid
        and r.replaced_at is null
        and r.reviewed_at is not null
        and (r.reviewed_at, r.id) < (
          coalesce(p_cursor_at, 'infinity'),
          coalesce(p_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
        )
      order by r.reviewed_at desc, r.id desc
      limit v_limit
    ) s;
  else
    select array_agg(s.id order by s.released_at, s.id) into v_ids
    from (
      select r.id, r.released_at
      from public.lab_reports r
      where r.ordering_doctor_id = v_uid
        and r.replaced_at is null
        and r.reviewed_at is null
        and (r.released_at, r.id) > (
          coalesce(p_cursor_at, '-infinity'),
          coalesce(p_cursor_id, '00000000-0000-0000-0000-000000000000')
        )
      order by r.released_at, r.id
      limit v_limit
    ) s;
  end if;

  return query
  select
    r.id,
    b.id,
    o.appointment_id,
    a.patient_name,
    a.care_recipient_name,
    a.care_recipient_relation,
    b.lab_name,
    b.collection,
    b.visit_date,
    a.timezone,
    o.priority,
    array(
      select i.test_name
      from public.lab_order_items i
      where i.order_id = o.id and i.test_type_id = any (b.ordered_test_ids)
      order by i.test_name
    ),
    r.released_at,
    r.version,
    r.reviewed_at,
    v.comment
  from unnest(v_ids) with ordinality as page (id, n)
  join public.lab_reports r on r.id = page.id
  join public.lab_bookings b on b.id = r.booking_id
  join public.lab_orders o on o.id = b.lab_order_id
  join public.appointments a on a.id = o.appointment_id
  left join public.lab_result_reviews v on v.booking_id = b.id
  order by page.n;
end;
$$;

revoke execute on function public.get_lab_results_inbox(boolean, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_lab_results_inbox(boolean, timestamptz, uuid, integer) to authenticated;

-- The lab's history of a booking ---------------------------------------------------------
-- As in LAB-16, plus each upload and each report sent back (with its note).
-- Sign-off is the move to report ready, by the signer. Latest version before
-- this: 20261115120000_lab_samples.sql.

create or replace function public.get_lab_booking_history(p_booking_id uuid)
returns table (
  status text,
  kind text,
  reason text,
  note text,
  visit_date date,
  slot_starts_at timestamptz,
  created_at timestamptz,
  actor text,
  actor_name text,
  actor_role text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_lab_id uuid := private.lab_caller('bookings.view');
  v_booking public.lab_bookings;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  v_booking := private.lab_booking_for(v_lab_id, p_booking_id, false);

  return query
  select
    s.status, s.kind, s.reason, s.note, s.visit_date, s.slot_starts_at, s.created_at,
    case
      when s.actor_id is null then 'system'
      when s.actor_id = v_booking.patient_id then 'patient'
      else 'staff'
    end,
    case when m.user_id is not null then u.raw_user_meta_data ->> 'full_name' end,
    m.role
  from (
    -- A release by sign-off is its own kind; reports from before LAB-17
    -- were published, not signed, and keep their plain status step.
    select e.status,
      case
        when e.kind = 'status' and e.status = 'report_ready' and exists (
          select 1 from public.lab_reports r
          where r.booking_id = e.booking_id
            and r.signed_off_by is not null
            and r.released_at = e.created_at
        ) then 'report_signed_off'
        else e.kind
      end,
      e.reason, e.note, e.visit_date, e.slot_starts_at,
      e.created_at, e.changed_by as actor_id
    from public.lab_booking_events e
    where e.booking_id = v_booking.id
    union all
    -- Uploads since LAB-17; an earlier report's upload was its release.
    select 'processing', 'report_uploaded', null, null, null, null,
      r.created_at, r.uploaded_by
    from public.lab_reports r
    where r.booking_id = v_booking.id
      and (r.released_at is null or r.signed_off_by is not null)
    union all
    -- The note can describe results, so only people who open reports see it.
    select 'processing', 'report_returned', null,
      case when private.lab_can('reports.view') then r.return_note end,
      null, null, r.returned_at, r.returned_by
    from public.lab_reports r
    where r.booking_id = v_booking.id and r.returned_at is not null
  ) s
  left join public.lab_members m
    on m.user_id = s.actor_id and m.lab_id = v_lab_id
  left join auth.users u on u.id = m.user_id
  order by s.created_at, s.kind = 'status' desc;
end;
$$;
