-- MedEase: corrected lab reports (LAB-18). Safe to run more than once. Run after
-- the collector's day migration (20261116120000_lab_collector_day.sql).
--
-- A released report that turns out wrong is corrected, never edited: the lab
-- uploads a corrected PDF with the reason, it waits for sign-off like any
-- report, and on release it replaces the old version, which stays readable and
-- marked replaced. The stamp prints that it's a correction, the reason and when
-- the report it replaces was released (ISO 15189:2022, 7.4.1.8). The patient
-- and the ordering doctor are told. Design: docs/lab-reports.md ("Corrections").

-- What a correction records -----------------------------------------------------------
-- corrects_report_id: the released report this one replaces, in the same
-- booking. correction_reason: why, as printed on the stamp, so one line of
-- Latin-1 text (the stamp's standard font).

alter table public.lab_reports
  add column if not exists corrects_report_id uuid references public.lab_reports (id);
alter table public.lab_reports add column if not exists correction_reason text;

alter table public.lab_reports drop constraint if exists lab_reports_correction_check;
alter table public.lab_reports add constraint lab_reports_correction_check
  check (
    (corrects_report_id is null) = (correction_reason is null)
    and (correction_reason is null or (
      char_length(correction_reason) between 3 and 200
      and correction_reason ~ '^[\x20-\x7e -ÿ]+$'
      and btrim(correction_reason) = correction_reason
    ))
  );

create index if not exists lab_reports_corrects_idx
  on public.lab_reports (corrects_report_id)
  where corrects_report_id is not null;

-- Every column people read so far, plus the two new ones. reviewed_at,
-- signed_off_by, returned_by and original_storage_path stay out.
revoke select on public.lab_reports from authenticated;
grant select (
  id, booking_id, lab_id, patient_id, care_recipient_id, version, storage_path,
  uploaded_by, created_at, replaced_at, ordering_doctor_id, released_at,
  signer_name, signer_title, returned_at, return_note, corrects_report_id,
  correction_reason
) on public.lab_reports to authenticated;

-- A booking has at most one current released report and one waiting for
-- sign-off, so a correction can wait while the released one stays visible.
drop index if exists public.lab_reports_current_idx;
create unique index if not exists lab_reports_current_released_idx
  on public.lab_reports (booking_id)
  where replaced_at is null and released_at is not null;
create unique index if not exists lab_reports_pending_idx
  on public.lab_reports (booking_id)
  where replaced_at is null and released_at is null;

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
    'lab_report_to_sign', 'lab_report_returned',
    'lab_booking_report_corrected', 'lab_result_corrected'
  ));

-- Uploading a correction ----------------------------------------------------------------
-- Like publish_lab_report, for a booking whose report is out: the booking stays
-- report ready and the released report stays what everyone sees until the
-- correction is signed off.

create or replace function public.publish_lab_correction(
  p_booking_id uuid,
  p_path text,
  p_reason text,
  p_notify_signers boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('reports.publish');
  v_reason text := nullif(btrim(regexp_replace(coalesce(p_reason, ''), '\s+', ' ', 'g')), '');
  v_booking public.lab_bookings;
  v_current_id uuid;
  v_version integer;
  v_report_id uuid;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if v_reason is null
    or char_length(v_reason) not between 3 and 200
    or v_reason !~ '^[\x20-\x7e -ÿ]+$' then
    raise exception 'invalid_reason';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and lab_id = v_lab_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;
  if v_booking.status <> 'report_ready' then
    raise exception 'status_changed';
  end if;

  select id into v_current_id
  from public.lab_reports
  where booking_id = v_booking.id
    and replaced_at is null
    and released_at is not null;
  -- Report ready always has one (require_lab_report); this only guards it.
  if v_current_id is null then
    raise exception 'status_changed';
  end if;

  if exists (
    select 1 from public.lab_reports
    where booking_id = v_booking.id
      and replaced_at is null
      and released_at is null
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
    uploaded_by, corrects_report_id, correction_reason
  ) values (
    v_booking.id, v_booking.lab_id, v_booking.patient_id,
    v_booking.care_recipient_id, v_version, p_path, auth.uid(),
    v_current_id, v_reason
  )
  returning id into v_report_id;

  if coalesce(p_notify_signers, true) then
    perform private.notify_lab(
      v_lab_id, 'lab_report_to_sign', '/lab/reports', 'reports.sign'
    );
  end if;

  perform private.write_audit(
    'lab_report.correction_uploaded', 'lab_booking', v_booking.id,
    jsonb_build_object('report_id', v_report_id, 'corrects', v_current_id)
  );

  return v_report_id;
end;
$$;

revoke execute on function public.publish_lab_correction(uuid, text, text, boolean) from public, anon;
grant execute on function public.publish_lab_correction(uuid, text, text, boolean) to authenticated;

-- Signing off --------------------------------------------------------------------------
-- As in LAB-17, and a correction is released in place of the report it
-- corrects: that one is marked replaced first (one current released report per
-- booking), the booking stays report ready, and the patient is told it was
-- corrected (route_lab_report tells the ordering doctor). Locks: the booking,
-- then the correction, then the report it replaces. Latest version before
-- this: 20261115150000_lab_report_sign_off.sql.

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
  -- A first report releases a booking being processed; a correction, one
  -- whose report is already out.
  if (v_report.corrects_report_id is null and v_booking.status <> 'processing')
    or (v_report.corrects_report_id is not null and v_booking.status <> 'report_ready') then
    raise exception 'status_changed';
  end if;

  if p_signed_path = v_report.storage_path then
    raise exception 'invalid_path';
  end if;
  perform private.claim_lab_report_upload(v_lab_id, v_booking.id, p_signed_path);

  if v_report.corrects_report_id is not null then
    update public.lab_reports
    set replaced_at = now()
    where id = v_report.corrects_report_id
      and booking_id = v_booking.id
      and replaced_at is null
      and released_at is not null;
    if not found then
      raise exception 'report_not_pending';
    end if;
  end if;

  update public.lab_reports
  set original_storage_path = storage_path,
      storage_path = p_signed_path,
      signed_off_by = auth.uid(),
      signer_name = v_signer.signer_name,
      signer_title = v_signer.signer_title,
      released_at = now()
  where id = v_report.id;

  if v_report.corrects_report_id is null then
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
  else
    perform private.notify(
      v_booking.patient_id, 'lab_booking_report_corrected', '/patient/lab-tests'
    );
    perform private.write_audit(
      'lab_report.corrected', 'lab_booking', v_booking.id,
      jsonb_build_object('report_id', v_report.id, 'corrects', v_report.corrects_report_id)
    );
  end if;
end;
$$;

-- The ordering doctor hears that a correction replaced a report they had.
-- Latest version before this: 20261115150000_lab_report_sign_off.sql.
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
      case
        when new.corrects_report_id is null then 'lab_result_ready'
        else 'lab_result_corrected'
      end,
      '/doctor/appointments/' || v_appointment_id || '/lab-tests'
    );
  end if;
  return new;
end;
$$;

-- Reviewing a result -----------------------------------------------------------------
-- As in PRC-11, but the current report is the released one: a correction
-- waiting for sign-off is neither read nor marked reviewed. Reviewing a
-- corrected report dates the comment again and tells the patient, since their
-- screens hid the comment written about the earlier version. Latest version
-- before this: 20261113120000_lab_results_inbox.sql.

create or replace function public.review_lab_result(
  p_booking_id uuid,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_booking public.lab_bookings;
  v_review public.lab_result_reviews;
  v_doctor_name text;
  v_unreviewed boolean;
  v_changed boolean;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if char_length(v_comment) > 1000 then
    raise exception 'invalid_comment';
  end if;

  -- Locked, so two saves take turns and a report can't be replaced meanwhile.
  select b.* into v_booking
  from public.lab_bookings b
  join public.lab_orders o on o.id = b.lab_order_id
  where b.id = p_booking_id and o.doctor_id = v_uid
  for update of b;

  if not found then
    raise exception 'booking_not_found';
  end if;
  if v_booking.status <> 'report_ready' then
    raise exception 'report_not_ready';
  end if;

  select r.reviewed_at is null into v_unreviewed
  from public.lab_reports r
  where r.booking_id = v_booking.id
    and r.replaced_at is null
    and r.released_at is not null;

  select * into v_review from public.lab_result_reviews
  where booking_id = v_booking.id;
  -- With no review yet every field is null, so this is "a comment was given".
  v_changed := v_review.comment is distinct from v_comment;

  if v_review.booking_id is null then
    select a.doctor_name into v_doctor_name
    from public.lab_orders o
    join public.appointments a on a.id = o.appointment_id
    where o.id = v_booking.lab_order_id;

    insert into public.lab_result_reviews (
      booking_id, doctor_id, patient_id, doctor_name, comment, commented_at
    ) values (
      v_booking.id, v_uid, v_booking.patient_id, v_doctor_name, v_comment,
      case when v_comment is not null then now() end
    );
    perform private.write_audit('lab_result.reviewed', 'lab_booking', v_booking.id);
  elsif not v_changed and not coalesce(v_unreviewed, false) then
    return;
  else
    -- Reviewing a corrected report dates the comment again: the patient's
    -- screens hide a comment older than the report they're shown.
    update public.lab_result_reviews
    set comment = v_comment,
        commented_at = case
          when not v_changed and not coalesce(v_unreviewed, false) then commented_at
          when v_comment is not null then now()
        end,
        reviewed_at = case when v_unreviewed then now() else reviewed_at end
    where booking_id = v_booking.id;
    if v_unreviewed then
      perform private.write_audit('lab_result.reviewed', 'lab_booking', v_booking.id);
    end if;
  end if;

  update public.lab_reports
  set reviewed_at = now()
  where booking_id = v_booking.id
    and replaced_at is null
    and released_at is not null
    and reviewed_at is null;

  if (v_changed or coalesce(v_unreviewed, false)) and v_comment is not null then
    perform private.notify(v_booking.patient_id, 'lab_result_comment', '/patient/lab-tests');
  end if;
  if v_changed then
    perform private.write_audit('lab_result.commented', 'lab_booking', v_booking.id);
  end if;
end;
$$;

-- What the doctor sees on a visit's lab tests --------------------------------------------
-- As in LAB-17, plus the correction's reason and the report it replaced.
-- Latest version before this: 20261115150000_lab_report_sign_off.sql.

drop function if exists public.get_lab_order_bookings(uuid);

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
  reviewed_at timestamptz,
  correction_reason text,
  previous_report_id uuid
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
    r.reviewed_at,
    r.correction_reason,
    r.corrects_report_id
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

revoke execute on function public.get_lab_order_bookings(uuid) from public, anon;
grant execute on function public.get_lab_order_bookings(uuid) to authenticated;

-- The doctor's results inbox ------------------------------------------------------------
-- As in LAB-17, plus the correction's reason and the report it replaced.
-- Latest version before this: 20261115150000_lab_report_sign_off.sql.

drop function if exists public.get_lab_results_inbox(boolean, timestamptz, uuid, integer);

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
  comment text,
  correction_reason text,
  previous_report_id uuid
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
    v.comment,
    r.correction_reason,
    r.corrects_report_id
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
-- As in LAB-21, plus a correction's upload and its release, each with the
-- reason for people who open reports. Latest version before this:
-- 20261116120000_lab_collector_day.sql.

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
  v_reports boolean := private.lab_can('reports.view');
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
            and r.corrects_report_id is null
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
    select
      case when r.corrects_report_id is null then 'processing' else 'report_ready' end,
      case when r.corrects_report_id is null then 'report_uploaded' else 'correction_uploaded' end,
      null,
      case when v_reports then r.correction_reason end,
      null, null, r.created_at, r.uploaded_by
    from public.lab_reports r
    where r.booking_id = v_booking.id
      and (r.released_at is null or r.signed_off_by is not null)
    union all
    -- The note can describe results, so only people who open reports see it.
    select
      case when r.corrects_report_id is null then 'processing' else 'report_ready' end,
      'report_returned', null,
      case when v_reports then r.return_note end,
      null, null, r.returned_at, r.returned_by
    from public.lab_reports r
    where r.booking_id = v_booking.id and r.returned_at is not null
    union all
    -- A correction released: there's no status move, so it's a step of its own.
    select 'report_ready', 'report_corrected', null,
      case when v_reports then r.correction_reason end,
      null, null, r.released_at, r.signed_off_by
    from public.lab_reports r
    where r.booking_id = v_booking.id
      and r.corrects_report_id is not null
      and r.released_at is not null
    union all
    -- Cash taken (LAB-21). A deleted account matches no member, so it shows
    -- as a former staff member, not as MedEase.
    select v_booking.status, 'cash_received', null, c.amount::text,
      null, null, c.received_at,
      coalesce(c.received_by, '00000000-0000-0000-0000-000000000000'::uuid)
    from public.lab_cash_payments c
    where c.booking_id = v_booking.id
  ) s
  left join public.lab_members m
    on m.user_id = s.actor_id and m.lab_id = v_lab_id
  left join auth.users u on u.id = m.user_id
  order by s.created_at, s.kind = 'status' desc;
end;
$$;

revoke execute on function public.get_lab_booking_history(uuid) from public, anon;
grant execute on function public.get_lab_booking_history(uuid) to authenticated;
