-- The collector's day view and cash (LAB-21). Design: docs/home-collection.md,
-- "Collector's day view".

-- Cash payments ----------------------------------------------------------------------
-- One row per cash booking paid. Only the lab reads it, so patients never see
-- staff ids; the booking's payment_status says it's paid.
--
-- Money records outlive the booking: a patient deleting their account deletes
-- their bookings, but not the lab's record of cash it holds. So the booking id
-- has no foreign key (only record_lab_cash writes rows, from a booking it has
-- locked), and the row names no patient. Only the lab's own deletion removes
-- it.

create table if not exists public.lab_cash_payments (
  booking_id uuid primary key,
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  amount integer not null check (amount > 0),
  -- A deleted staff account leaves the payment with no name.
  received_by uuid references auth.users (id) on delete set null,
  -- The lab's day the cash was taken, for the end-of-day summary.
  received_day date not null,
  received_at timestamptz not null default now()
);

-- The day's summary, per person.
create index if not exists lab_cash_payments_day_idx
  on public.lab_cash_payments (lab_id, received_day, received_by);
create index if not exists lab_cash_payments_received_by_idx
  on public.lab_cash_payments (received_by);

alter table public.lab_cash_payments enable row level security;
revoke all on public.lab_cash_payments from public, anon, authenticated, service_role;
grant select on public.lab_cash_payments to authenticated;

drop policy if exists "Labs read their cash payments" on public.lab_cash_payments;
create policy "Labs read their cash payments" on public.lab_cash_payments
  for select to authenticated
  using (
    lab_id = (select private.current_lab_id())
    and (
      (select private.lab_can('bookings.view_all'))
      or received_by = (select auth.uid())
    )
  );

drop policy if exists "Clinical data needs a second factor" on public.lab_cash_payments;
create policy "Clinical data needs a second factor" on public.lab_cash_payments
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.lab_cash_payments;
create trigger require_second_factor
  before insert or update or delete on public.lab_cash_payments
  for each statement execute function private.require_second_factor();

-- Recording cash ----------------------------------------------------------------------
-- The full total, on a cash booking that isn't cancelled or paid yet. The
-- amount the person saw comes back and must still match.

create or replace function private.record_lab_cash(
  p_lab_id uuid,
  p_booking public.lab_bookings,
  p_amount integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_booking.payment_method <> 'cash' then
    raise exception 'not_cash';
  end if;
  if p_booking.status = 'cancelled' then
    raise exception 'not_payable';
  end if;
  if p_booking.payment_status = 'paid' then
    raise exception 'already_paid';
  end if;
  if p_amount is distinct from p_booking.total then
    raise exception 'amount_changed';
  end if;

  insert into public.lab_cash_payments (
    booking_id, lab_id, amount, received_by, received_day
  ) values (
    p_booking.id, p_lab_id, p_booking.total, auth.uid(),
    (now() at time zone p_booking.timezone)::date
  );
  update public.lab_bookings set payment_status = 'paid' where id = p_booking.id;
end;
$$;

revoke execute on function private.record_lab_cash(uuid, public.lab_bookings, integer) from public;

create or replace function public.record_lab_cash(p_booking_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('bookings.collect');
  v_booking public.lab_bookings;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if p_booking_id is null then
    raise exception 'booking_not_found';
  end if;

  v_booking := private.lab_booking_for(v_lab_id, p_booking_id, true);
  perform private.record_lab_cash(v_lab_id, v_booking, p_amount);
end;
$$;

revoke execute on function public.record_lab_cash(uuid, integer) from public, anon;
grant execute on function public.record_lab_cash(uuid, integer) to authenticated;

-- Collecting, with the cash in the same transaction ---------------------------------
-- p_cash_amount null: the sample only (online, or cash not taken yet).

create or replace function public.collect_lab_booking(
  p_booking_id uuid,
  p_from_status text,
  p_cash_amount integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lab_caller('bookings.collect');
  v_booking public.lab_bookings;
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  perform public.move_lab_booking(p_booking_id, p_from_status, 'sample_collected');

  if p_cash_amount is not null then
    v_booking := private.lab_booking_for(v_lab_id, p_booking_id, true);
    perform private.record_lab_cash(v_lab_id, v_booking, p_cash_amount);
  end if;
end;
$$;

revoke execute on function public.collect_lab_booking(uuid, text, integer) from public, anon;
grant execute on function public.collect_lab_booking(uuid, text, integer) to authenticated;

-- End-of-day summary -------------------------------------------------------------------
-- Per person, for one lab day: the home visits given to them that day, the
-- samples they marked collected that day (whichever day the visit was booked
-- for, and kept even if a new sample is asked for later), and the cash they
-- took that day. So what they did and what they took describe the same day,
-- and a past day's line doesn't change when an old visit is cleared. Those
-- who see every booking get everyone; anyone else their own line.

-- The day's collections, by lab and time.
create index if not exists lab_booking_events_collected_idx
  on public.lab_booking_events (lab_id, created_at)
  where kind = 'status' and status = 'sample_collected';

create or replace function public.get_lab_cash_summary(p_day date)
returns table (
  user_id uuid,
  full_name text,
  role text,
  visits integer,
  collected integer,
  cash_count integer,
  cash_total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_lab_id uuid := private.lab_caller('bookings.collect');
  v_all boolean := private.lab_can('bookings.view_all');
  v_tz text := 'Asia/Karachi';
begin
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  if p_day is null then
    raise exception 'invalid_day';
  end if;

  return query
  with day_visits as (
    -- The lab's bookings that day by its (lab, day) index, then each one's
    -- assignment by its key.
    select a.collector_id as person, count(*) as visits
    from public.lab_bookings b
    join public.lab_booking_assignments a on a.booking_id = b.id
    where b.lab_id = v_lab_id
      and b.visit_date = p_day
      and b.collection = 'home'
      and b.confirmed_at is not null
      and b.status <> 'cancelled'
      and (v_all or a.collector_id = auth.uid())
    group by a.collector_id
  ),
  day_collected as (
    -- Each booking once, however often it was collected that day.
    select e.changed_by as person, count(distinct e.booking_id) as collected
    from public.lab_booking_events e
    where e.lab_id = v_lab_id
      and e.kind = 'status'
      and e.status = 'sample_collected'
      and e.created_at >= (p_day::timestamp at time zone v_tz)
      and e.created_at < ((p_day + 1)::timestamp at time zone v_tz)
      and e.changed_by is not null
      and (v_all or e.changed_by = auth.uid())
    group by e.changed_by
  ),
  day_cash as (
    select c.received_by as person, count(*) as cash_count, sum(c.amount) as cash_total
    from public.lab_cash_payments c
    where c.lab_id = v_lab_id
      and c.received_day = p_day
      and (v_all or c.received_by = auth.uid())
    group by c.received_by
  ),
  -- Both sides as one list, so cash from a deleted account (no person) keeps
  -- its own line.
  people as (
    select x.person,
      sum(x.visits) as visits,
      sum(x.collected) as collected,
      sum(x.cash_count) as cash_count,
      sum(x.cash_total) as cash_total
    from (
      select v.person, v.visits, 0 as collected, 0 as cash_count, 0 as cash_total
      from day_visits v
      union all
      select d.person, 0, d.collected, 0, 0
      from day_collected d
      union all
      select c.person, 0, 0, c.cash_count, c.cash_total
      from day_cash c
    ) x
    group by x.person
  )
  select p.person,
    case when m.user_id is not null then u.raw_user_meta_data ->> 'full_name' end,
    m.role,
    p.visits::integer, p.collected::integer, p.cash_count::integer, p.cash_total::bigint
  from people p
  left join public.lab_members m on m.user_id = p.person and m.lab_id = v_lab_id
  left join auth.users u on u.id = m.user_id
  order by u.raw_user_meta_data ->> 'full_name' nulls last, p.person;
end;
$$;

revoke execute on function public.get_lab_cash_summary(date) from public, anon;
grant execute on function public.get_lab_cash_summary(date) to authenticated;

-- History shows the cash ----------------------------------------------------------------
-- As in the sign-off migration, with each cash payment as a step. The note
-- carries the amount.

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
