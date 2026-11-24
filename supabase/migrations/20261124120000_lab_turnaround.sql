-- Turnaround (LAB-19): each booked item keeps the lab's promised hours as
-- booked, the clock starts when the sample is collected, and the booking holds
-- when its report is due and when it was first released. The patient sees when
-- to expect the report; the lab sees what is past due and how often it keeps
-- its promise. Safe to run more than once. Design: docs/lab-samples.md,
-- "Turnaround (LAB-19)".

-- The promise per item, kept as booked -------------------------------------------------

alter table public.lab_booking_items add column if not exists turnaround_hours integer;
alter table public.lab_booking_items drop constraint if exists lab_booking_items_turnaround_hours_check;
alter table public.lab_booking_items add constraint lab_booking_items_turnaround_hours_check
  check (turnaround_hours between 1 and 720);

-- A test's own hours, or a package's slowest test.
create or replace function private.lab_item_turnaround_hours(
  p_lab_test_id uuid,
  p_package_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max(t.turnaround_hours)
  from public.lab_tests t
  where t.id = p_lab_test_id
     or t.id in (
       select p.lab_test_id
       from public.lab_package_items p
       where p.package_id = p_package_id
     );
$$;

revoke execute on function private.lab_item_turnaround_hours(uuid, uuid) from public;

-- The trigger every booking path already runs on each item: the tubes it needs
-- (LAB-16) and now its promised hours.
create or replace function private.snapshot_lab_item_sample_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.sample_types := private.lab_item_sample_types(new.test_type_id, new.package_id);
  new.turnaround_hours := private.lab_item_turnaround_hours(new.lab_test_id, new.package_id);
  return new;
end;
$$;

-- Items booked before this take their test's or package's current hours.
update public.lab_booking_items
set turnaround_hours = private.lab_item_turnaround_hours(lab_test_id, package_id)
where turnaround_hours is null;

-- The clock on each booking -------------------------------------------------------------

alter table public.lab_bookings add column if not exists turnaround_started_at timestamptz;
alter table public.lab_bookings add column if not exists report_due_at timestamptz;
alter table public.lab_bookings add column if not exists reported_at timestamptz;

alter table public.lab_bookings drop constraint if exists lab_bookings_turnaround_check;
alter table public.lab_bookings add constraint lab_bookings_turnaround_check
  check (
    (report_due_at is null or turnaround_started_at is not null)
    and (report_due_at is null or report_due_at > turnaround_started_at)
  );

-- Kept by the database with every status move, whoever makes it: collecting
-- starts the clock at the slowest item's promise, a new sample restarts it,
-- cancelling stops it, and the first release records when the report came.
-- A correction (LAB-18) doesn't move the booking, so reported_at stays the
-- first release.
create or replace function private.track_lab_turnaround()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hours integer;
begin
  if new.status = 'sample_collected' then
    select max(i.turnaround_hours) into v_hours
    from public.lab_booking_items i
    where i.booking_id = new.id;

    new.turnaround_started_at := now();
    new.report_due_at := now() + make_interval(hours => v_hours);
    new.reported_at := null;
  elsif new.status in ('recollection_needed', 'cancelled') then
    new.turnaround_started_at := null;
    new.report_due_at := null;
  elsif new.status = 'report_ready' then
    new.reported_at := coalesce(new.reported_at, now());
  end if;
  return new;
end;
$$;

revoke execute on function private.track_lab_turnaround() from public;

drop trigger if exists track_lab_turnaround on public.lab_bookings;
create trigger track_lab_turnaround
  before update of status on public.lab_bookings
  for each row
  when (
    old.status is distinct from new.status
    and new.status in ('sample_collected', 'recollection_needed', 'cancelled', 'report_ready')
  )
  execute function private.track_lab_turnaround();

-- Bookings already in the lab or finished, from their history. Only those
-- still in the lab get a due time: today's catalog hours may not be what was
-- promised when a finished one was booked, so finished ones count as released
-- but not as on time or late.
update public.lab_bookings b
set turnaround_started_at = e.collected_at,
    report_due_at = case
      when b.status = 'report_ready' then null
      else e.collected_at + make_interval(hours => i.hours)
    end
from (
  select booking_id, max(created_at) as collected_at
  from public.lab_booking_events
  where status = 'sample_collected'
  group by booking_id
) e,
(
  select booking_id, max(turnaround_hours) as hours
  from public.lab_booking_items
  group by booking_id
) i
where e.booking_id = b.id
  and i.booking_id = b.id
  and i.hours is not null
  and b.status in ('sample_collected', 'processing', 'report_ready')
  and b.turnaround_started_at is null;

update public.lab_bookings b
set reported_at = e.reported_at
from (
  select booking_id, min(created_at) as reported_at
  from public.lab_booking_events
  where status = 'report_ready'
  group by booking_id
) e
where e.booking_id = b.id
  and b.status = 'report_ready'
  and b.reported_at is null;

-- What's past due, soonest first, per lab.
create index if not exists lab_bookings_report_due_idx
  on public.lab_bookings (lab_id, report_due_at)
  where status in ('sample_collected', 'processing');
-- Reports released lately, for the lab's record.
create index if not exists lab_bookings_reported_idx
  on public.lab_bookings (lab_id, reported_at)
  where reported_at is not null;

-- The lab's record ------------------------------------------------------------------------

-- Samples in the lab past their promised time now, and over the last p_days
-- days the reports released, how many came on time, and the median hours from
-- collection to report. Bookings with no promise (an item with no known test)
-- count as released but not as on time or late.
create or replace function public.get_lab_turnaround(p_days integer default 30)
returns table (
  overdue integer,
  reported integer,
  on_time integer,
  timed integer,
  median_hours numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('bookings.view_all');
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 90);
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  return query
  select
    (
      select count(*)::integer
      from public.lab_bookings b
      where b.lab_id = v_lab_id
        and b.status in ('sample_collected', 'processing')
        and b.report_due_at < now()
    ),
    count(*)::integer,
    (count(*) filter (where r.reported_at <= r.report_due_at))::integer,
    (count(*) filter (where r.report_due_at is not null))::integer,
    round((percentile_cont(0.5) within group (
      order by extract(epoch from r.reported_at - r.turnaround_started_at) / 3600
    ))::numeric, 1)
  from public.lab_bookings r
  where r.lab_id = v_lab_id
    and r.reported_at is not null
    and r.reported_at >= now() - make_interval(days => v_days);
end;
$$;

revoke execute on function public.get_lab_turnaround(integer) from public, anon;
grant execute on function public.get_lab_turnaround(integer) to authenticated;
