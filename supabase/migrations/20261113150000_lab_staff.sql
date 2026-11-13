-- Lab staff accounts (LAB-07). A lab is one organisation with several people:
-- the account that registered it is the lab admin, who invites staff with a role.
-- lab_id everywhere still means lab_profiles.id (the admin's user id); what
-- changes is how the database finds the caller's lab: from lab_members, read on
-- every request, so removing someone takes effect at once. Design:
-- docs/lab-staff.md.

-- Members ----------------------------------------------------------------------

create table if not exists public.lab_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'front_desk', 'collector', 'pathologist')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  removed_at timestamptz,
  removed_by uuid references auth.users (id) on delete set null,
  -- One admin per lab: the account that registered it, never removed.
  constraint lab_members_one_admin check ((role = 'admin') = (user_id = lab_id)),
  constraint lab_members_admin_active check (role <> 'admin' or status = 'active'),
  constraint lab_members_activated check ((status = 'invited') = (activated_at is null) or status = 'removed'),
  constraint lab_members_removed check ((status = 'removed') = (removed_at is not null))
);

-- The staff list and booking notices read a lab's people.
create index if not exists lab_members_lab_idx
  on public.lab_members (lab_id, status);

alter table public.lab_members enable row level security;

revoke all on public.lab_members from anon, authenticated;
grant select on public.lab_members to authenticated;
grant all on public.lab_members to service_role;

-- Each person reads their own row (the app checks it on every lab page); the
-- admin lists the lab's people through get_lab_staff.
drop policy if exists "Read own lab membership" on public.lab_members;
create policy "Read own lab membership" on public.lab_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Every lab so far was one account: make it the admin.
insert into public.lab_members (user_id, lab_id, role, status, activated_at, created_at)
select l.id, l.id, 'admin', 'active', l.created_at, l.created_at
from public.lab_profiles l
on conflict (user_id) do nothing;

create or replace function private.add_lab_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lab_members (user_id, lab_id, role, status, activated_at)
  values (new.id, new.id, 'admin', 'active', now())
  on conflict (user_id) do nothing;
  return null;
end;
$$;

revoke execute on function private.add_lab_admin() from public;

drop trigger if exists add_lab_admin on public.lab_profiles;
create trigger add_lab_admin
  after insert on public.lab_profiles
  for each row
  execute function private.add_lab_admin();

-- Who can do what -------------------------------------------------------------
-- The one matrix. src/features/lab-staff/lib/lab-permissions.ts repeats it to
-- choose which pages and buttons to show.

create or replace function private.lab_role_can(p_role text, p_permission text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'admin' then p_permission is not null
    when 'front_desk' then p_permission in (
      'bookings.view', 'bookings.collect', 'bookings.cancel', 'reports.view'
    )
    when 'collector' then p_permission in ('bookings.view', 'bookings.collect')
    when 'pathologist' then p_permission in (
      'bookings.view', 'bookings.process', 'reports.view', 'reports.publish'
    )
    else false
  end;
$$;

revoke execute on function private.lab_role_can(text, text) from public;
grant execute on function private.lab_role_can(text, text) to authenticated, service_role;

-- The caller's lab while they're an active member signed in as a lab account.
-- Policies call it as (select private.current_lab_id()), once per query.
create or replace function private.current_lab_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.lab_id
  from public.lab_members m
  where m.user_id = auth.uid()
    and m.status = 'active'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'lab';
$$;

revoke execute on function private.current_lab_id() from public;
grant execute on function private.current_lab_id() to authenticated, service_role;

create or replace function private.lab_can(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select private.lab_role_can(m.role, p_permission)
    from public.lab_members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'lab'
  ), false);
$$;

revoke execute on function private.lab_can(text) from public;
grant execute on function private.lab_can(text) to authenticated, service_role;

-- Every lab write starts here: the caller's lab, if their role allows it.
create or replace function private.lab_caller(p_permission text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.lab_members;
begin
  select * into v_member
  from public.lab_members m
  where m.user_id = auth.uid()
    and m.status = 'active'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'lab';

  if not found then
    raise exception 'not_lab';
  end if;
  if not private.lab_role_can(v_member.role, p_permission) then
    raise exception 'not_permitted';
  end if;

  return v_member.lab_id;
end;
$$;

revoke execute on function private.lab_caller(text) from public;

-- Booking notices go to the people who take samples or arrange them (admin,
-- front desk, collectors), as private.lab_role_can says. A lab has a handful
-- of people, so this is one small insert.
create or replace function private.notify_lab(
  p_lab_id uuid,
  p_kind text,
  p_href text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, href)
  select m.user_id, p_kind, p_href
  from public.lab_members m
  where m.lab_id = p_lab_id
    and m.status = 'active'
    and private.lab_role_can(m.role, 'bookings.collect');
$$;

revoke execute on function private.notify_lab(uuid, text, text) from public;

-- Reads: the whole lab, not just the admin ------------------------------------

-- Staff don't read lab_profiles: it holds the licence and the review note,
-- which are the admin's. They get the lab's name from get_lab_membership.
drop policy if exists "Lab staff read their lab" on public.lab_profiles;

-- The caller's own membership and the lab's name, in one call per request.
create or replace function public.get_lab_membership()
returns table (lab_id uuid, role text, status text, lab_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.lab_id, m.role, m.status, l.lab_name
  from public.lab_members m
  join public.lab_profiles l on l.id = m.lab_id
  where m.user_id = (select auth.uid());
$$;

revoke execute on function public.get_lab_membership() from public, anon;
grant execute on function public.get_lab_membership() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['lab_tests', 'lab_packages', 'lab_package_items'] loop
    execute format('drop policy if exists "Labs read their catalog" on public.%I', t);
    execute format(
      'create policy "Labs read their catalog" on public.%I
         for select to authenticated
         using (lab_id = (select private.current_lab_id()))',
      t
    );
  end loop;

  foreach t in array array['lab_collection_settings', 'lab_collection_hours', 'lab_service_areas'] loop
    execute format('drop policy if exists "Labs read their home collection" on public.%I', t);
    execute format(
      'create policy "Labs read their home collection" on public.%I
         for select to authenticated
         using (lab_id = (select private.current_lab_id()))',
      t
    );
  end loop;

  foreach t in array array['lab_booking_items', 'lab_booking_events'] loop
    execute format('drop policy if exists "Labs read their bookings" on public.%I', t);
    execute format(
      'create policy "Labs read their bookings" on public.%I
         for select to authenticated
         using (
           lab_id = (select private.current_lab_id())
           and exists (
             select 1 from public.lab_bookings b
             where b.id = %I.booking_id and b.confirmed_at is not null
           )
         )',
      t, t
    );
  end loop;
end;
$$;

drop policy if exists "Labs read their bookings" on public.lab_bookings;
create policy "Labs read their bookings" on public.lab_bookings
  for select to authenticated
  using (lab_id = (select private.current_lab_id()) and confirmed_at is not null);

-- Collectors don't open reports.
drop policy if exists "Labs read their reports" on public.lab_reports;
create policy "Labs read their reports" on public.lab_reports
  for select to authenticated
  using (
    lab_id = (select private.current_lab_id())
    and (select private.lab_can('reports.view'))
  );

-- Invitations ride on our own auth tokens ---------------------------------------

alter table public.auth_tokens drop constraint if exists auth_tokens_purpose_check;
alter table public.auth_tokens add constraint auth_tokens_purpose_check
  check (purpose in ('email_confirmation', 'password_reset', 'lab_invite'));

-- Managing staff ----------------------------------------------------------------

-- The app has just created the account (admin API, unconfirmed, no password);
-- this files it under the caller's lab. Only an account that is brand new,
-- never used and nobody's member yet, so it can't claim someone else's.
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
  if p_role is null or p_role not in ('front_desk', 'collector', 'pathologist') then
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

revoke execute on function public.add_lab_staff(uuid, text) from public, anon;
grant execute on function public.add_lab_staff(uuid, text) to authenticated;

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
  if p_role is null or p_role not in ('front_desk', 'collector', 'pathologist') then
    raise exception 'invalid_role';
  end if;

  update public.lab_members
  set role = p_role
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

revoke execute on function public.set_lab_staff_role(uuid, text) from public, anon;
grant execute on function public.set_lab_staff_role(uuid, text) to authenticated;

-- Access ends here; the app then bans the account so its session can't be
-- refreshed. The row stays, so the lab's history still names who did what.
-- Returns 'invited' for an account that was never used, which the app deletes,
-- and 'active' for one to ban (someone invited again after leaving included).
create or replace function public.remove_lab_staff(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('staff');
  v_member public.lab_members;
  v_unused boolean;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  select * into v_member
  from public.lab_members
  where user_id = p_user_id
    and lab_id = v_lab_id
    and role <> 'admin'
    and status <> 'removed'
  for update;

  if not found then
    raise exception 'member_not_found';
  end if;

  -- Never confirmed and never signed in: an account nobody has used.
  select u.email_confirmed_at is null and u.last_sign_in_at is null
  into v_unused
  from auth.users u
  where u.id = p_user_id;

  update public.lab_members
  set status = 'removed',
      removed_at = now(),
      removed_by = auth.uid()
  where user_id = p_user_id;

  -- An unused invitation stops working too.
  update public.auth_tokens
  set used_at = now()
  where user_id = p_user_id and used_at is null;

  perform private.write_audit(
    'lab.staff_removed', 'user', p_user_id, jsonb_build_object('lab_id', v_lab_id)
  );

  return case
    when v_member.status = 'invited' and coalesce(v_unused, false) then 'invited'
    else 'active'
  end;
end;
$$;

revoke execute on function public.remove_lab_staff(uuid) from public, anon;
grant execute on function public.remove_lab_staff(uuid) to authenticated;

-- Someone the lab removed keeps their account (banned), so inviting the same
-- email again reopens their row instead. Returns null when the email isn't a
-- removed member of the caller's lab; the app then reports it as in use. The
-- account stays banned until they accept the new invitation.
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
  if p_role is null or p_role not in ('front_desk', 'collector', 'pathologist') then
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

revoke execute on function public.restore_lab_staff(text, text) from public, anon;
grant execute on function public.restore_lab_staff(text, text) to authenticated;

-- The invitation link is the permission: the app consumes its token, then
-- calls this with the secret key.
create or replace function public.accept_lab_invite(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lab_members
  set status = 'active',
      activated_at = now()
  where user_id = p_user_id and status = 'invited';

  if not found then
    raise exception 'invite_not_found';
  end if;
end;
$$;

revoke execute on function public.accept_lab_invite(uuid) from public, anon, authenticated;
grant execute on function public.accept_lab_invite(uuid) to service_role;

-- The admin's staff list: names and emails live on the accounts.
create or replace function public.get_lab_staff()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  status text,
  invited_at timestamptz,
  activated_at timestamptz,
  invite_expires_at timestamptz
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
    )
  from public.lab_members m
  join auth.users u on u.id = m.user_id
  where m.lab_id = v_lab_id and m.status <> 'removed'
  order by m.role = 'admin' desc, m.created_at;
end;
$$;

revoke execute on function public.get_lab_staff() from public, anon;
grant execute on function public.get_lab_staff() to authenticated;

-- Lab functions: the caller's lab and role, not their own id --------------------
-- Bodies as they stood, with lab_caller in place of auth.uid() and its role
-- check. A report records who uploaded it, and booking notices reach the lab's
-- people through notify_lab.

create or replace function public.delete_lab_package(p_package_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('catalog');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  if exists (
    select 1 from public.lab_booking_items
    where package_id = p_package_id and lab_id = v_lab_id
  ) then
    raise exception 'package_has_bookings';
  end if;

  delete from public.lab_packages
  where id = p_package_id and lab_id = v_lab_id;

  if not found then
    raise exception 'package_not_found';
  end if;
end;
$function$;

create or replace function private.lock_collection_lab()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('home_collection');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  -- lab_caller found the membership, and its lab_id points at the profile.
  perform 1 from public.lab_profiles where id = v_lab_id for update;
  return v_lab_id;
end;
$function$;

create or replace function private.log_lab_booking_rescheduled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.lab_booking_events (
    booking_id, lab_id, patient_id, status, kind, visit_date, slot_starts_at, changed_by
  ) values (
    new.id, new.lab_id, new.patient_id, new.status, 'rescheduled',
    new.visit_date, new.slot_starts_at, auth.uid()
  );
  perform private.notify_lab(new.lab_id, 'lab_booking_rescheduled', '/lab/bookings');
  return null;
end;
$function$;

create or replace function public.move_lab_booking(p_booking_id uuid, p_from_status text, p_to_status text, p_reason text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller(case p_to_status
    when 'sample_collected' then 'bookings.collect'
    when 'cancelled' then 'bookings.cancel'
    when 'report_ready' then 'reports.publish'
    else 'bookings.process'
  end);
  v_booking public.lab_bookings;
  -- Trimmed of spaces, tabs and line breaks, as the app does.
  v_note text := nullif(
    btrim(replace(coalesce(p_note, ''), E'\r\n', E'\n'), E' \t\n\r'),
    ''
  );
  v_needs_reason boolean := p_to_status in ('recollection_needed', 'cancelled');
begin
  if p_booking_id is null or p_from_status is null or p_to_status is null then
    raise exception 'invalid_move';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and lab_id = v_lab_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status <> p_from_status then
    raise exception 'status_changed';
  end if;

  if not (
    (p_from_status = 'booked' and p_to_status in ('sample_collected', 'cancelled'))
    or (p_from_status = 'recollection_needed' and p_to_status in ('sample_collected', 'cancelled'))
    or (p_from_status = 'sample_collected' and p_to_status in ('processing', 'recollection_needed', 'cancelled'))
    or (p_from_status = 'processing' and p_to_status in ('report_ready', 'recollection_needed', 'cancelled'))
  ) then
    raise exception 'invalid_move';
  end if;

  -- A sample can't be taken before the booked day.
  if p_from_status = 'booked' and p_to_status = 'sample_collected'
    and (now() at time zone v_booking.timezone)::date < v_booking.visit_date then
    raise exception 'too_early';
  end if;

  -- Which reasons fit which status is the table's check, the one list.
  if v_needs_reason and p_reason is null then
    raise exception 'reason_required';
  end if;
  if not v_needs_reason and p_reason is not null then
    raise exception 'invalid_reason';
  end if;
  if p_reason = 'other' and v_note is null then
    raise exception 'note_required';
  end if;

  if v_note is not null and (not v_needs_reason or char_length(v_note) > 500) then
    raise exception 'invalid_note';
  end if;

  begin
    update public.lab_bookings
    set status = p_to_status,
        status_reason = p_reason,
        status_note = v_note,
        status_changed_at = now(),
        cancelled_by = case when p_to_status = 'cancelled' then 'lab' end
    where id = v_booking.id;
  exception when check_violation then
    raise exception 'invalid_reason';
  end;
end;
$function$;

create or replace function private.notify_lab_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status = 'booked' then
    perform private.notify(new.patient_id, 'lab_booking_booked', '/patient/lab-tests');
    perform private.notify_lab(new.lab_id, 'lab_booking_new', '/lab/bookings');
  end if;
  return null;
end;
$function$;

create or replace function private.notify_lab_booking_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.status = 'awaiting_payment' then
    if new.status = 'booked' then
      perform private.notify(new.patient_id, 'lab_booking_booked', '/patient/lab-tests');
      perform private.notify_lab(new.lab_id, 'lab_booking_new', '/lab/bookings');
    elsif new.cancelled_by = 'system' then
      perform private.notify(new.patient_id, 'lab_booking_payment_expired', '/patient/lab-tests');
    end if;
  elsif new.status = 'cancelled' and new.cancelled_by = 'patient' then
    perform private.notify_lab(new.lab_id, 'lab_booking_cancelled', '/lab/bookings?stage=finished');
  else
    perform private.notify(new.patient_id, 'lab_booking_' || new.status, '/patient/lab-tests');
  end if;
  return null;
end;
$function$;

create or replace function public.publish_lab_report(p_booking_id uuid, p_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('reports.publish');
  v_booking public.lab_bookings;
  v_report_id uuid;
begin
  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and lab_id = v_lab_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  -- Only a booking being processed; a second click finds it ready already.
  if v_booking.status <> 'processing' then
    raise exception 'status_changed';
  end if;

  if p_path is null or p_path !~ (
    '^' || v_lab_id::text || '/' || v_booking.id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  ) then
    raise exception 'invalid_path';
  end if;

  delete from private.checked_uploads
  where bucket = 'lab-reports'
    and path = p_path
    and owner_id = v_lab_id;
  if not found then
    raise exception 'upload_not_checked';
  end if;

  insert into public.lab_reports (
    booking_id, lab_id, patient_id, care_recipient_id, storage_path, uploaded_by
  ) values (
    v_booking.id, v_booking.lab_id, v_booking.patient_id,
    v_booking.care_recipient_id, p_path, auth.uid()
  )
  returning id into v_report_id;

  update public.lab_bookings
  set status = 'report_ready',
      status_reason = null,
      status_note = null,
      status_changed_at = now()
  where id = v_booking.id;

  perform private.write_audit(
    'lab_report.published', 'lab_booking', v_booking.id,
    jsonb_build_object('report_id', v_report_id)
  );

  return v_report_id;
end;
$function$;

create or replace function public.save_lab_package(p_package_id uuid, p_name text, p_description text, p_price integer, p_test_ids uuid[], p_listed boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('catalog');
  v_test_ids uuid[];
  v_id uuid;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  -- One package save at a time per lab, so the count below holds.
  perform 1 from public.lab_profiles where id = v_lab_id for update;

  v_test_ids := array(
    select distinct test_id from unnest(p_test_ids) as test_id
    where test_id is not null
  );
  if cardinality(v_test_ids) not between 2 and 30 then
    raise exception 'package_size';
  end if;
  if (
    select count(*) from public.lab_tests
    where id = any (v_test_ids) and lab_id = v_lab_id
  ) <> cardinality(v_test_ids) then
    raise exception 'test_not_found';
  end if;

  if p_package_id is null then
    if (select count(*) from public.lab_packages where lab_id = v_lab_id) >= 50 then
      raise exception 'too_many_packages';
    end if;

    insert into public.lab_packages (lab_id, name, description, price, listed)
    values (
      v_lab_id, trim(p_name), nullif(trim(p_description), ''), p_price,
      coalesce(p_listed, true)
    )
    returning id into v_id;
  else
    update public.lab_packages
    set name = trim(p_name),
        description = nullif(trim(p_description), ''),
        price = p_price,
        listed = coalesce(p_listed, true)
    where id = p_package_id and lab_id = v_lab_id
    returning id into v_id;

    if v_id is null then
      raise exception 'package_not_found';
    end if;

    delete from public.lab_package_items
    where package_id = v_id and lab_test_id <> all (v_test_ids);
  end if;

  insert into public.lab_package_items (package_id, lab_id, lab_test_id)
  select v_id, v_lab_id, test_id from unnest(v_test_ids) as test_id
  on conflict do nothing;

  return v_id;
end;
$function$;

create or replace function public.save_lab_test(p_test_type_id text, p_price integer, p_turnaround_hours integer, p_home_collection boolean, p_preparation text DEFAULT NULL::text, p_listed boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('catalog');
  v_id uuid;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if not exists (select 1 from public.lab_test_types where id = p_test_type_id) then
    raise exception 'unknown_test';
  end if;

  -- The table's checks refuse a price or turnaround out of range.
  insert into public.lab_tests (
    lab_id, test_type_id, price, turnaround_hours, home_collection,
    preparation, listed
  ) values (
    v_lab_id, p_test_type_id, p_price, p_turnaround_hours,
    coalesce(p_home_collection, false),
    nullif(trim(p_preparation), ''),
    coalesce(p_listed, true)
  )
  on conflict (lab_id, test_type_id) do update
  set price = excluded.price,
      turnaround_hours = excluded.turnaround_hours,
      home_collection = excluded.home_collection,
      preparation = excluded.preparation,
      listed = excluded.listed
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.save_lab_verification(p_registration_number text, p_licensing_authority text, p_address text, p_license_path text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('profile');
  v_lab public.lab_profiles;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  select * into v_lab
  from public.lab_profiles
  where id = v_lab_id
  for update;

  if v_lab.verification_status not in ('pending', 'needs_info') then
    raise exception 'verification_closed';
  end if;

  if p_license_path is not null then
    if p_license_path !~ ('^' || v_lab_id::text || '/license-[0-9a-f-]{36}\.(pdf|jpg|png)$') then
      raise exception 'invalid_path';
    end if;
    delete from private.checked_uploads
    where bucket = 'lab-documents'
      and path = p_license_path
      and owner_id = v_lab_id;
    if not found then
      raise exception 'upload_not_checked';
    end if;
  end if;

  -- The table's checks refuse blank or overlong values and unknown authorities.
  update public.lab_profiles
  set registration_number = trim(p_registration_number),
      licensing_authority = p_licensing_authority,
      address = trim(p_address),
      license_document_path = coalesce(p_license_path, license_document_path),
      verification_status = 'pending',
      verification_note = null,
      submitted_at = clock_timestamp()
  where id = v_lab_id;

  perform private.write_audit('lab.details_submitted', 'lab', v_lab_id);

  return case
    when p_license_path is not null
      and v_lab.license_document_path is distinct from p_license_path
    then v_lab.license_document_path
  end;
end;
$function$;

create or replace function public.set_lab_package_listed(p_package_id uuid, p_listed boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('catalog');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  update public.lab_packages
  set listed = coalesce(p_listed, false)
  where id = p_package_id and lab_id = v_lab_id;

  if not found then
    raise exception 'package_not_found';
  end if;
end;
$function$;

create or replace function public.set_lab_test_listed(p_test_id uuid, p_listed boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lab_id uuid := private.lab_caller('catalog');
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  update public.lab_tests
  set listed = coalesce(p_listed, false)
  where id = p_test_id and lab_id = v_lab_id;

  if not found then
    raise exception 'test_not_found';
  end if;
end;
$function$;
