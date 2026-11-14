-- Sample tracking (LAB-16): each collection attempt gets an accession number,
-- and each container (one per sample type) a code under it that goes on a
-- barcode label. The lab prints labels ahead, or the code is made when the
-- sample is marked collected; a new sample after a rejection gets a new
-- accession. The lab also reads each booking's history with who made each
-- move. Design: docs/lab-samples.md.

-- Accession numbers ---------------------------------------------------------------------

-- One row per lab per day: the last number given out. Taking the next one
-- locks only this row, so labs never wait on each other.
create table if not exists public.lab_accession_counters (
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  day date not null,
  last integer not null check (last > 0),
  primary key (lab_id, day)
);

alter table public.lab_accession_counters enable row level security;
revoke all on public.lab_accession_counters from public, anon, authenticated, service_role;

-- Samples -------------------------------------------------------------------------------

create table if not exists public.lab_samples (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  -- Copied from the booking so row-level security reads each row directly.
  lab_id uuid not null,
  patient_id uuid not null,
  -- YYMMDD-NNNN: the lab's day and its number that day.
  accession text not null check (accession ~ '^[0-9]{6}-[0-9]{4,}$'),
  sample_type text not null check (sample_type in ('blood', 'urine', 'stool')),
  -- What the barcode carries: the accession and a letter for the container.
  code text generated always as (
    accession || '-' || case sample_type
      when 'blood' then 'B'
      when 'urine' then 'U'
      else 'S'
    end
  ) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  collected_at timestamptz,
  collected_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  foreign key (booking_id, lab_id, patient_id)
    references public.lab_bookings (id, lab_id, patient_id) on delete cascade,
  check (rejected_at is not null or rejection_reason is null)
);

-- A lab scans a code to find its sample.
create unique index if not exists lab_samples_code_key
  on public.lab_samples (lab_id, code);
-- One open container of each type per booking.
create unique index if not exists lab_samples_open_key
  on public.lab_samples (booking_id, sample_type)
  where rejected_at is null;
create index if not exists lab_samples_booking_idx
  on public.lab_samples (booking_id, created_at);

alter table public.lab_samples enable row level security;
revoke all on public.lab_samples from public, anon, authenticated, service_role;
grant select on public.lab_samples to authenticated;

-- The same rule as the booking's items and history: the lab's people who can
-- see the booking (collectors: lab visits and their own home visits).
drop policy if exists "Labs read their bookings" on public.lab_samples;
create policy "Labs read their bookings" on public.lab_samples
  for select to authenticated
  using (
    lab_id = (select private.current_lab_id())
    and exists (
      select 1 from public.lab_bookings b
      where b.id = lab_samples.booking_id and b.confirmed_at is not null
    )
  );

drop policy if exists "Clinical data needs a second factor" on public.lab_samples;
create policy "Clinical data needs a second factor" on public.lab_samples
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.lab_samples;
create trigger require_second_factor
  before insert or update or delete on public.lab_samples
  for each statement execute function private.require_second_factor();

-- What each booked item needs, kept as booked: a package the lab edits later
-- mustn't change which tubes an earlier booking gets. Filled in on insert by
-- every booking path; existing items take their package's current tests.
alter table public.lab_booking_items add column if not exists sample_types text[];
alter table public.lab_booking_items drop constraint if exists lab_booking_items_sample_types_check;
alter table public.lab_booking_items add constraint lab_booking_items_sample_types_check
  check (sample_types <@ array['blood', 'urine', 'stool']);

create or replace function private.lab_item_sample_types(
  p_test_type_id text,
  p_package_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_agg(distinct t.sample_type order by t.sample_type)
  from public.lab_test_types t
  where t.id = p_test_type_id
     or t.id in (
       select lt.test_type_id
       from public.lab_package_items p
       join public.lab_tests lt on lt.id = p.lab_test_id
       where p.package_id = p_package_id
     );
$$;

revoke execute on function private.lab_item_sample_types(text, uuid) from public;

create or replace function private.snapshot_lab_item_sample_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.sample_types := private.lab_item_sample_types(new.test_type_id, new.package_id);
  return new;
end;
$$;

revoke execute on function private.snapshot_lab_item_sample_types() from public;

drop trigger if exists snapshot_lab_item_sample_types on public.lab_booking_items;
create trigger snapshot_lab_item_sample_types
  before insert on public.lab_booking_items
  for each row execute function private.snapshot_lab_item_sample_types();

update public.lab_booking_items
set sample_types = private.lab_item_sample_types(test_type_id, package_id)
where sample_types is null;

-- Gives a booking its containers, unless it has open ones already. Called with
-- the booking row locked, so two prints can't both make an accession.
create or replace function private.issue_lab_samples(p_booking public.lab_bookings)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone p_booking.timezone)::date;
  v_number integer;
  v_types text[];
begin
  if exists (
    select 1 from public.lab_samples s
    where s.booking_id = p_booking.id and s.rejected_at is null
  ) then
    return;
  end if;

  -- What the booked tests need, as they were booked.
  select array_agg(distinct st.sample_type order by st.sample_type) into v_types
  from public.lab_booking_items i
  cross join lateral unnest(i.sample_types) as st (sample_type)
  where i.booking_id = p_booking.id;

  insert into public.lab_accession_counters as c (lab_id, day, last)
  values (p_booking.lab_id, v_day, 1)
  on conflict (lab_id, day) do update set last = c.last + 1
  returning c.last into v_number;

  insert into public.lab_samples (
    booking_id, lab_id, patient_id, accession, sample_type, created_by
  )
  select
    p_booking.id, p_booking.lab_id, p_booking.patient_id,
    to_char(v_day, 'YYMMDD') || '-' || lpad(v_number::text, greatest(4, char_length(v_number::text)), '0'),
    t.sample_type,
    auth.uid()
  -- An item with no known tests (a package emptied before this was kept)
  -- still needs a tube.
  from unnest(coalesce(v_types, array['blood'])) as t (sample_type);
end;
$$;

revoke execute on function private.issue_lab_samples(public.lab_bookings) from public;

-- Kept by the database with every status move: collecting fills in who and
-- when (making the codes if nobody printed labels), and a new sample request
-- or a cancellation retires the open containers, so a pre-printed tube can't
-- pass for a live one and the next attempt gets a new accession.
create or replace function private.track_lab_samples()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'sample_collected' then
    perform private.issue_lab_samples(new);
    update public.lab_samples
    set collected_at = now(), collected_by = auth.uid()
    where booking_id = new.id and rejected_at is null and collected_at is null;
  elsif new.status in ('recollection_needed', 'cancelled') then
    update public.lab_samples
    set rejected_at = now(), rejected_by = auth.uid(),
        rejection_reason = new.status_reason
    where booking_id = new.id and rejected_at is null;
  end if;
  return null;
end;
$$;

revoke execute on function private.track_lab_samples() from public;

drop trigger if exists track_lab_samples on public.lab_bookings;
create trigger track_lab_samples
  after update of status on public.lab_bookings
  for each row
  when (
    old.status is distinct from new.status
    and new.status in ('sample_collected', 'recollection_needed', 'cancelled')
  )
  execute function private.track_lab_samples();

-- Who on the lab may act on a booking: the lab's own, and for collectors
-- without every booking, lab visits and their own home visits. The same rule
-- as move_lab_booking and the bookings policy.
create or replace function private.lab_booking_for(
  p_lab_id uuid,
  p_booking_id uuid,
  p_lock boolean
)
returns public.lab_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.lab_bookings;
begin
  if p_lock then
    select * into v_booking from public.lab_bookings
    where id = p_booking_id and lab_id = p_lab_id and confirmed_at is not null
    for update;
  else
    select * into v_booking from public.lab_bookings
    where id = p_booking_id and lab_id = p_lab_id and confirmed_at is not null;
  end if;

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
  return v_booking;
end;
$$;

revoke execute on function private.lab_booking_for(uuid, uuid, boolean) from public;

-- Labels: the booking's open containers, made on the first print. Reprints
-- return the same codes until a new sample is asked for. A booking collected
-- before codes existed gets them on its first print.
create or replace function public.prepare_lab_sample_labels(p_booking_id uuid)
returns table (code text, sample_type text)
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

  v_booking := private.lab_booking_for(v_lab_id, p_booking_id, true);

  if v_booking.status not in ('booked', 'recollection_needed', 'sample_collected', 'processing') then
    raise exception 'not_printable';
  end if;
  perform private.issue_lab_samples(v_booking);

  return query
  select s.code, s.sample_type
  from public.lab_samples s
  where s.booking_id = v_booking.id and s.rejected_at is null
  order by s.code;
end;
$$;

revoke execute on function public.prepare_lab_sample_labels(uuid) from public, anon;
grant execute on function public.prepare_lab_sample_labels(uuid) to authenticated;

-- Moves use the same check as labels and history, so the three can't drift
-- apart. Otherwise as in the collectors migration.
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

  v_booking := private.lab_booking_for(v_lab_id, p_booking_id, true);

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

-- History with names --------------------------------------------------------------------

-- Every step of a booking and who took it. Staff names live on the accounts,
-- which the lab's people can't read, so the lab gets them here. Someone since
-- removed keeps their name; a deleted account shows as staff with no name.
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
    e.status, e.kind, e.reason, e.note, e.visit_date, e.slot_starts_at, e.created_at,
    case
      when e.changed_by is null then 'system'
      when e.changed_by = v_booking.patient_id then 'patient'
      else 'staff'
    end,
    case when m.user_id is not null then u.raw_user_meta_data ->> 'full_name' end,
    m.role
  from public.lab_booking_events e
  left join public.lab_members m
    on m.user_id = e.changed_by and m.lab_id = v_lab_id
  left join auth.users u on u.id = m.user_id
  where e.booking_id = v_booking.id
  order by e.created_at, e.kind = 'status' desc;
end;
$$;

revoke execute on function public.get_lab_booking_history(uuid) from public, anon;
grant execute on function public.get_lab_booking_history(uuid) to authenticated;
