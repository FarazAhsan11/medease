-- Assigning a collector to a home collection (LAB-06). The admin or front desk
-- picks who goes to each home visit; collectors then see lab visits and only
-- the home visits given to them, since a home visit carries the patient's
-- address. Design: docs/home-collection.md, "Assigning a collector".

-- Who can do what: two more rights -------------------------------------------
-- bookings.assign: give a home visit to a collector (admin, front desk).
-- bookings.view_all: every booking, not only one's own home visits (everyone
-- but collectors). src/features/lab-staff/lib/lab-permissions.ts repeats this.

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
    when 'pathologist' then p_permission in (
      'bookings.view', 'bookings.view_all', 'bookings.process', 'reports.view',
      'reports.publish'
    )
    else false
  end;
$$;

-- Assignments ---------------------------------------------------------------------
-- Their own table, not a column on lab_bookings: patients read their booking
-- rows, and the lab's staff ids are none of theirs. One row per booking.

-- Lets an assignment name a member and their lab together.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lab_members_user_lab_key'
      and conrelid = 'public.lab_members'::regclass
  ) then
    alter table public.lab_members
      add constraint lab_members_user_lab_key unique (user_id, lab_id);
  end if;
end;
$$;

create table if not exists public.lab_booking_assignments (
  booking_id uuid primary key,
  -- Copied from the booking, so the keys below hold the booking and the
  -- collector to one lab, and row level security reads each row directly.
  lab_id uuid not null,
  patient_id uuid not null,
  -- Deleting a person's account deletes their assignments with it; removing
  -- them from the lab keeps the member row, and so their visits made.
  collector_id uuid not null,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  foreign key (booking_id, lab_id, patient_id)
    references public.lab_bookings (id, lab_id, patient_id) on delete cascade,
  foreign key (collector_id, lab_id)
    references public.lab_members (user_id, lab_id) on delete cascade
);

-- A collector's visits (their day view, LAB-21) and clearing them when they
-- leave.
create index if not exists lab_booking_assignments_collector_idx
  on public.lab_booking_assignments (collector_id);

alter table public.lab_booking_assignments enable row level security;
revoke all on public.lab_booking_assignments from public, anon, authenticated, service_role;
grant select on public.lab_booking_assignments to authenticated;

-- The lab's people who see every booking read every assignment; a collector
-- reads their own.
drop policy if exists "Labs read their assignments" on public.lab_booking_assignments;
create policy "Labs read their assignments" on public.lab_booking_assignments
  for select to authenticated
  using (
    lab_id = (select private.current_lab_id())
    and (
      (select private.lab_can('bookings.view_all'))
      or collector_id = (select auth.uid())
    )
  );

drop policy if exists "Clinical data needs a second factor" on public.lab_booking_assignments;
create policy "Clinical data needs a second factor" on public.lab_booking_assignments
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.lab_booking_assignments;
create trigger require_second_factor
  before insert or update or delete on public.lab_booking_assignments
  for each statement execute function private.require_second_factor();

-- Collectors see lab visits and their own home visits ------------------------------
-- Items and history follow, since their policies read lab_bookings.

drop policy if exists "Labs read their bookings" on public.lab_bookings;
create policy "Labs read their bookings" on public.lab_bookings
  for select to authenticated
  using (
    lab_id = (select private.current_lab_id())
    and confirmed_at is not null
    and (
      (select private.lab_can('bookings.view_all'))
      or collection = 'lab'
      or exists (
        select 1 from public.lab_booking_assignments a
        where a.booking_id = lab_bookings.id
          and a.collector_id = (select auth.uid())
      )
    )
  );

-- Notices ------------------------------------------------------------------------------

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
    'lab_booking_assigned', 'lab_booking_unassigned'
  ));

-- Lab notices go to the active people whose role has a right, never to the
-- person who made the change. Booking notices pick the right with
-- private.lab_booking_audience.
drop function if exists private.notify_lab(uuid, text, text);
create or replace function private.notify_lab(
  p_lab_id uuid,
  p_kind text,
  p_href text,
  p_permission text default 'bookings.collect'
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
    and m.user_id is distinct from auth.uid()
    and private.lab_role_can(m.role, p_permission);
$$;

revoke execute on function private.notify_lab(uuid, text, text, text) from public;

-- Who hears about a booking: for a lab visit, everyone who takes samples (any
-- of them may see the patient at the branch); for a home visit, the people who
-- arrange visits, since a collector sees only their own.
create or replace function private.lab_booking_audience(p_collection text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_collection = 'home' then 'bookings.assign' else 'bookings.collect' end;
$$;

revoke execute on function private.lab_booking_audience(text) from public;

-- Tells a collector about a home visit of theirs, unless they made the change,
-- or p_arrangers_told says notify_lab already reached them (an admin or front
-- desk sent on the visit).
create or replace function private.notify_lab_collector(
  p_collector_id uuid,
  p_kind text,
  p_href text,
  p_arrangers_told boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, href)
  select m.user_id, p_kind, p_href
  from public.lab_members m
  where m.user_id = p_collector_id
    and m.user_id is distinct from auth.uid()
    and m.status = 'active'
    and not (p_arrangers_told and private.lab_role_can(m.role, 'bookings.assign'));
$$;

revoke execute on function private.notify_lab_collector(uuid, text, text, boolean) from public;

-- Assigning -------------------------------------------------------------------------

-- Gives a home visit still to collect to one of the lab's active people who
-- can take samples, or takes it back with a null collector.
create or replace function public.assign_lab_collector(
  p_booking_id uuid,
  p_collector_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('bookings.assign');
  v_booking public.lab_bookings;
  v_previous uuid;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  -- The booking's lock also queues this behind a reschedule or a move.
  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and lab_id = v_lab_id and confirmed_at is not null
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;
  if v_booking.collection <> 'home' then
    raise exception 'not_home_collection';
  end if;
  if v_booking.status not in ('booked', 'recollection_needed') then
    raise exception 'not_assignable';
  end if;

  if p_collector_id is not null and not exists (
    select 1 from public.lab_members m
    where m.user_id = p_collector_id
      and m.lab_id = v_lab_id
      and m.status = 'active'
      and private.lab_role_can(m.role, 'bookings.collect')
  ) then
    raise exception 'invalid_collector';
  end if;

  select a.collector_id into v_previous
  from public.lab_booking_assignments a
  where a.booking_id = v_booking.id;

  if v_previous is not distinct from p_collector_id then
    return;
  end if;

  if p_collector_id is null then
    delete from public.lab_booking_assignments where booking_id = v_booking.id;
  else
    insert into public.lab_booking_assignments (
      booking_id, lab_id, patient_id, collector_id, assigned_by
    ) values (
      v_booking.id, v_lab_id, v_booking.patient_id, p_collector_id, auth.uid()
    )
    on conflict (booking_id) do update
      set collector_id = excluded.collector_id,
          assigned_by = excluded.assigned_by,
          assigned_at = now();
    perform private.notify_lab_collector(p_collector_id, 'lab_booking_assigned', '/lab/bookings', false);
  end if;

  if v_previous is not null then
    perform private.notify_lab_collector(v_previous, 'lab_booking_unassigned', '/lab/bookings', false);
  end if;
end;
$$;

revoke execute on function public.assign_lab_collector(uuid, uuid) from public, anon;
grant execute on function public.assign_lab_collector(uuid, uuid) to authenticated;

-- The people a home visit can go to, for the assign menu: collectors first,
-- each with their home visits still to make on the days asked for
-- ({"2026-11-13": 2}), so the work can be spread. Names live on the accounts.
-- The days are the ones on the page.
drop function if exists public.get_lab_collectors();
create or replace function public.get_lab_collectors(p_days date[] default '{}')
returns table (user_id uuid, full_name text, role text, visits jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('bookings.assign');
begin
  if cardinality(p_days) > 200 then
    raise exception 'too_many_days';
  end if;

  return query
  with per_day as (
    -- The lab's bookings on those days by its (lab, day) index, then each
    -- one's assignment by its key.
    select a.collector_id, b.visit_date, count(*) as visits
    from public.lab_bookings b
    join public.lab_booking_assignments a on a.booking_id = b.id
    where b.lab_id = v_lab_id
      and b.visit_date = any (coalesce(p_days, '{}'))
      and b.status in ('booked', 'recollection_needed')
    group by a.collector_id, b.visit_date
  ),
  load as (
    select d.collector_id, jsonb_object_agg(d.visit_date, d.visits) as visits
    from per_day d
    group by d.collector_id
  )
  select m.user_id, u.raw_user_meta_data ->> 'full_name', m.role,
    coalesce(l.visits, '{}'::jsonb)
  from public.lab_members m
  join auth.users u on u.id = m.user_id
  left join load l on l.collector_id = m.user_id
  where m.lab_id = v_lab_id
    and m.status = 'active'
    and private.lab_role_can(m.role, 'bookings.collect')
  order by m.role = 'collector' desc, u.raw_user_meta_data ->> 'full_name', m.user_id;
end;
$$;

revoke execute on function public.get_lab_collectors(date[]) from public, anon;
grant execute on function public.get_lab_collectors(date[]) to authenticated;

-- Booking notices by audience ----------------------------------------------------------

create or replace function private.notify_lab_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'booked' then
    perform private.notify(new.patient_id, 'lab_booking_booked', '/patient/lab-tests');
    perform private.notify_lab(
      new.lab_id, 'lab_booking_new', '/lab/bookings',
      private.lab_booking_audience(new.collection)
    );
  end if;
  return null;
end;
$$;

revoke execute on function private.notify_lab_booking() from public;

-- Keeping assignments true -------------------------------------------------------------

-- A new window may not suit the collector: the visit goes back to be assigned,
-- and they're told it left their list.
create or replace function private.log_lab_booking_rescheduled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collector uuid;
begin
  insert into public.lab_booking_events (
    booking_id, lab_id, patient_id, status, kind, visit_date, slot_starts_at, changed_by
  ) values (
    new.id, new.lab_id, new.patient_id, new.status, 'rescheduled',
    new.visit_date, new.slot_starts_at, auth.uid()
  );
  perform private.notify_lab(
    new.lab_id, 'lab_booking_rescheduled', '/lab/bookings',
    private.lab_booking_audience(new.collection)
  );

  delete from public.lab_booking_assignments
  where booking_id = new.id
  returning collector_id into v_collector;
  if v_collector is not null then
    perform private.notify_lab_collector(v_collector, 'lab_booking_unassigned', '/lab/bookings', false);
  end if;
  return null;
end;
$$;

revoke execute on function private.log_lab_booking_rescheduled() from public;

-- A cancelled visit stays assigned, for the record, and its collector hears of
-- it. A home visit needing a new sample goes back to the arrangers and its
-- collector, since someone has to call again.
create or replace function private.notify_lab_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_audience text := private.lab_booking_audience(new.collection);
  v_collector uuid;
begin
  if old.status = 'awaiting_payment' then
    if new.status = 'booked' then
      perform private.notify(new.patient_id, 'lab_booking_booked', '/patient/lab-tests');
      perform private.notify_lab(new.lab_id, 'lab_booking_new', '/lab/bookings', v_audience);
    elsif new.cancelled_by = 'system' then
      perform private.notify(new.patient_id, 'lab_booking_payment_expired', '/patient/lab-tests');
    end if;
    return null;
  end if;

  if new.status = 'cancelled' and new.cancelled_by = 'patient' then
    perform private.notify_lab(new.lab_id, 'lab_booking_cancelled', '/lab/bookings?stage=finished', v_audience);
  else
    perform private.notify(new.patient_id, 'lab_booking_' || new.status, '/patient/lab-tests');
  end if;

  if new.collection <> 'home' then
    return null;
  end if;
  if new.status = 'recollection_needed' then
    perform private.notify_lab(new.lab_id, 'lab_booking_recollection_needed', '/lab/bookings', v_audience);
  end if;

  select a.collector_id into v_collector
  from public.lab_booking_assignments a
  where a.booking_id = new.id;
  if v_collector is null then
    return null;
  end if;

  if new.status = 'cancelled' then
    perform private.notify_lab_collector(
      v_collector, 'lab_booking_cancelled', '/lab/bookings?stage=finished',
      new.cancelled_by = 'patient'
    );
  elsif new.status = 'recollection_needed' then
    perform private.notify_lab_collector(
      v_collector, 'lab_booking_recollection_needed', '/lab/bookings', true
    );
  end if;
  return null;
end;
$$;

revoke execute on function private.notify_lab_booking_status() from public;

-- Someone who leaves, or whose new role can't take samples, gives back the
-- visits they hadn't made yet; done ones keep their name.
create or replace function private.release_lab_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and private.lab_role_can(new.role, 'bookings.collect') then
    return null;
  end if;

  delete from public.lab_booking_assignments a
  using public.lab_bookings b
  where a.collector_id = new.user_id
    and b.id = a.booking_id
    and b.status in ('booked', 'recollection_needed');
  return null;
end;
$$;

revoke execute on function private.release_lab_assignments() from public;

drop trigger if exists release_lab_assignments on public.lab_members;
create trigger release_lab_assignments
  after update of status, role on public.lab_members
  for each row
  when (old.status is distinct from new.status or old.role is distinct from new.role)
  execute function private.release_lab_assignments();

-- Moves: a collector moves only what they can see ---------------------------------
-- As in the staff migration, plus: a home visit given to someone else, or to
-- nobody, isn't a collector's to move.

create or replace function public.move_lab_booking(
  p_booking_id uuid,
  p_from_status text,
  p_to_status text,
  p_reason text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  if not found
    or (
      v_booking.collection = 'home'
      and not private.lab_can('bookings.view_all')
      and not exists (
        select 1 from public.lab_booking_assignments a
        where a.booking_id = v_booking.id and a.collector_id = auth.uid()
      )
    ) then
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
$$;

revoke execute on function public.move_lab_booking(uuid, text, text, text, text) from public, anon;
grant execute on function public.move_lab_booking(uuid, text, text, text, text) to authenticated;
