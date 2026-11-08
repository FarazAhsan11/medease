-- MedEase: home collection setup (LAB-06). Safe to run more than once.
--
-- A lab sets the cities it collects samples in (each with a fee), weekly
-- collection hours split into slots, and how many visits a slot can take.
-- Home collection can be on only with hours and at least one city, and the
-- functions below keep it that way, so "collects at home" is one column.
-- Design: docs/home-collection.md.

-- Settings, one row per lab ---------------------------------------------------------

create table if not exists public.lab_collection_settings (
  lab_id uuid primary key references public.lab_profiles (id) on delete cascade,
  accepting boolean not null default false,
  slot_minutes smallint not null default 60 check (slot_minutes in (30, 60, 90, 120)),
  -- Visits one slot can take: roughly how many collectors are out.
  capacity smallint not null default 2 check (capacity between 1 and 20),
  -- How far ahead a slot must start to be booked.
  notice_hours smallint not null default 2 check (notice_hours in (1, 2, 3, 6, 12, 24)),
  -- The fee is waived when an order reaches this amount.
  free_above integer check (free_above between 1 and 1000000),
  timezone text not null default 'Asia/Karachi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Weekly collection hours ---------------------------------------------------------------

create table if not exists public.lab_collection_hours (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists lab_collection_hours_lab_weekday_idx
  on public.lab_collection_hours (lab_id, weekday);

-- Cities a lab collects in ------------------------------------------------------------

create table if not exists public.lab_service_areas (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  city text not null check (city = any (private.cities())),
  fee integer not null check (fee between 0 and 10000),
  -- Shown to patients: which parts of the city, or what isn't covered.
  note text check (char_length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Also serves the lab's list and the patient view's lookups by lab.
  unique (lab_id, city)
);

-- Privileges: the lab reads its own rows; every write goes through a function.

do $$
declare
  collection_table text;
begin
  foreach collection_table in array array['lab_collection_settings', 'lab_service_areas']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', collection_table);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      collection_table
    );
  end loop;

  foreach collection_table in array array[
    'lab_collection_settings', 'lab_collection_hours', 'lab_service_areas'
  ]
  loop
    execute format('alter table public.%I enable row level security', collection_table);
    execute format(
      'revoke all on public.%I from public, anon, authenticated, service_role',
      collection_table
    );
    execute format('grant select on public.%I to authenticated', collection_table);
    execute format(
      'drop policy if exists "Labs read their home collection" on public.%I',
      collection_table
    );
    execute format(
      'create policy "Labs read their home collection" on public.%I
         for select to authenticated
         using (lab_id = (select auth.uid()))',
      collection_table
    );
  end loop;
end;
$$;

-- The caller is a lab with a profile that has passed two-factor. Locks the
-- lab's profile row, so a lab's collection writes run one at a time.
create or replace function private.lock_collection_lab()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  perform 1 from public.lab_profiles where id = v_lab_id for update;
  if not found then
    raise exception 'lab_not_found';
  end if;
  return v_lab_id;
end;
$$;

revoke execute on function private.lock_collection_lab() from public;

-- Hours and settings ---------------------------------------------------------------------
-- p_ranges: [{ "weekday": 1, "start": "07:00", "end": "11:00" }, ...], replacing
-- the week. Bookings already made are kept.

create or replace function public.save_lab_collection_schedule(
  p_ranges jsonb,
  p_slot_minutes integer,
  p_capacity integer,
  p_notice_hours integer,
  p_free_above integer,
  p_accepting boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lock_collection_lab();
begin
  if not coalesce(
    p_slot_minutes in (30, 60, 90, 120)
      and p_capacity between 1 and 20
      and p_notice_hours in (1, 2, 3, 6, 12, 24)
      and (p_free_above is null or p_free_above between 1 and 1000000),
    false
  ) then
    raise exception 'invalid_collection_settings';
  end if;
  if p_ranges is null
    or jsonb_typeof(p_ranges) <> 'array'
    or jsonb_array_length(p_ranges) > 21 then
    raise exception 'invalid_schedule';
  end if;

  -- The same HH:MM rule as the editor, so '24:00' or seconds can't be saved
  -- and then refused when the lab next saves from the app.
  if exists (
    select 1 from jsonb_array_elements(p_ranges) as r
    where not coalesce(
      r ->> 'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        and r ->> 'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',
      false
    )
  ) then
    raise exception 'invalid_schedule';
  end if;

  delete from public.lab_collection_hours where lab_id = v_lab_id;

  begin
    insert into public.lab_collection_hours (lab_id, weekday, start_time, end_time)
    select v_lab_id, (r ->> 'weekday')::smallint, (r ->> 'start')::time, (r ->> 'end')::time
    from jsonb_array_elements(p_ranges) as r;
  exception when others then
    -- A missing field, a time that doesn't parse, or an end before its start.
    raise exception 'invalid_schedule';
  end;

  if exists (
    select 1 from public.lab_collection_hours
    where lab_id = v_lab_id
    group by weekday
    having count(*) > 3
  ) or exists (
    select 1 from public.lab_collection_hours
    where lab_id = v_lab_id
      and end_time - start_time < make_interval(mins => p_slot_minutes)
  ) then
    raise exception 'invalid_schedule';
  end if;

  if exists (
    select 1
    from public.lab_collection_hours a
    join public.lab_collection_hours b
      on b.lab_id = a.lab_id and b.weekday = a.weekday and b.id <> a.id
     and a.start_time < b.end_time and b.start_time < a.end_time
    where a.lab_id = v_lab_id
  ) then
    raise exception 'overlapping_hours';
  end if;

  if coalesce(p_accepting, false) then
    if not exists (select 1 from public.lab_collection_hours where lab_id = v_lab_id) then
      raise exception 'no_collection_hours';
    end if;
    if not exists (select 1 from public.lab_service_areas where lab_id = v_lab_id) then
      raise exception 'no_service_areas';
    end if;
  end if;

  insert into public.lab_collection_settings (
    lab_id, accepting, slot_minutes, capacity, notice_hours, free_above
  ) values (
    v_lab_id, coalesce(p_accepting, false), p_slot_minutes, p_capacity,
    p_notice_hours, p_free_above
  )
  on conflict (lab_id) do update
  set accepting = excluded.accepting,
      slot_minutes = excluded.slot_minutes,
      capacity = excluded.capacity,
      notice_hours = excluded.notice_hours,
      free_above = excluded.free_above;
end;
$$;

revoke execute on function public.save_lab_collection_schedule(jsonb, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.save_lab_collection_schedule(jsonb, integer, integer, integer, integer, boolean) to authenticated;

-- Service areas ------------------------------------------------------------------------------

-- Adds a city, or updates one when an id is given. Returns its id.
create or replace function public.save_lab_service_area(
  p_id uuid,
  p_city text,
  p_fee integer,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lock_collection_lab();
  v_note text := nullif(trim(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g')), '');
  v_id uuid;
begin
  if not coalesce(
    p_city = any (private.cities())
      and p_fee between 0 and 10000
      and (v_note is null or char_length(v_note) <= 200),
    false
  ) then
    raise exception 'invalid_service_area';
  end if;

  begin
    if p_id is null then
      insert into public.lab_service_areas (lab_id, city, fee, note)
      values (v_lab_id, p_city, p_fee, v_note)
      returning id into v_id;
    else
      update public.lab_service_areas
      set city = p_city, fee = p_fee, note = v_note
      where id = p_id and lab_id = v_lab_id
      returning id into v_id;
    end if;
  exception when unique_violation then
    raise exception 'duplicate_service_area';
  end;

  if v_id is null then
    raise exception 'service_area_not_found';
  end if;
  return v_id;
end;
$$;

revoke execute on function public.save_lab_service_area(uuid, text, integer, text) from public, anon;
grant execute on function public.save_lab_service_area(uuid, text, integer, text) to authenticated;

-- Removes a city. The last one can't go while home collection is on.
create or replace function public.delete_lab_service_area(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := private.lock_collection_lab();
begin
  delete from public.lab_service_areas where id = p_id and lab_id = v_lab_id;
  if not found then
    raise exception 'service_area_not_found';
  end if;

  if exists (
    select 1 from public.lab_collection_settings
    where lab_id = v_lab_id and accepting
  ) and not exists (
    select 1 from public.lab_service_areas where lab_id = v_lab_id
  ) then
    raise exception 'last_service_area';
  end if;
end;
$$;

revoke execute on function public.delete_lab_service_area(uuid) from public, anon;
grant execute on function public.delete_lab_service_area(uuid) to authenticated;

-- What patients see ------------------------------------------------------------------------
-- Only labs in lab_directory (approved, email confirmed) with home collection on.

create or replace view public.lab_collection_areas
with (security_invoker = false) as
select
  a.id,
  a.lab_id,
  a.city,
  a.fee,
  a.note,
  s.free_above
from public.lab_service_areas a
join public.lab_collection_settings s on s.lab_id = a.lab_id and s.accepting
join public.lab_directory d on d.id = a.lab_id;

revoke all on public.lab_collection_areas from public, anon, authenticated, service_role;
grant select on public.lab_collection_areas to anon, authenticated;

-- Bookable collection slots over the next days, in the lab's timezone, from the
-- lab's minimum notice on. spots_left is the capacity until bookings exist
-- (LAB-03 subtracts them).
create or replace function public.get_lab_collection_slots(
  p_lab_id uuid,
  p_days integer default 7
)
returns table (starts_at timestamptz, ends_at timestamptz, spots_left integer)
language sql
stable
security definer
set search_path = ''
as $$
  with lab as (
    select
      s.lab_id,
      s.timezone,
      make_interval(mins => s.slot_minutes) as step,
      s.capacity,
      make_interval(hours => s.notice_hours) as notice
    from public.lab_collection_settings s
    join public.lab_directory d on d.id = s.lab_id
    where s.lab_id = p_lab_id and s.accepting
  ),
  days as (
    select lab.*, (now() at time zone lab.timezone)::date + n as day
    from lab, generate_series(0, least(greatest(coalesce(p_days, 7), 1), 14) - 1) as n
  ),
  slots as (
    select distinct
      (s.local_start at time zone days.timezone) as starts_at,
      days.step,
      days.capacity,
      days.notice
    from days
    join public.lab_collection_hours h
      on h.lab_id = days.lab_id and h.weekday = extract(dow from days.day)
    cross join lateral generate_series(
      days.day + h.start_time,
      days.day + h.end_time - days.step,
      days.step
    ) as s(local_start)
  )
  select s.starts_at, s.starts_at + s.step, s.capacity::integer
  from slots s
  where s.starts_at >= now() + s.notice
  order by s.starts_at;
$$;

revoke execute on function public.get_lab_collection_slots(uuid, integer) from public;
grant execute on function public.get_lab_collection_slots(uuid, integer) to anon, authenticated;

-- A test or package shows home collection only while its lab collects at home.

create or replace view public.lab_test_offers
with (security_invoker = false) as
select
  t.id,
  t.lab_id,
  d.lab_name,
  d.address as lab_address,
  t.test_type_id,
  t.price,
  t.turnaround_hours,
  t.home_collection and exists (
    select 1 from public.lab_collection_settings s
    where s.lab_id = t.lab_id and s.accepting
  ) as home_collection,
  coalesce(t.preparation, tt.preparation) as preparation
from public.lab_tests t
join public.lab_directory d on d.id = t.lab_id
join public.lab_test_types tt on tt.id = t.test_type_id
where t.listed;

create or replace view public.lab_package_offers
with (security_invoker = false) as
select
  p.id,
  p.lab_id,
  d.lab_name,
  d.address as lab_address,
  p.name,
  p.description,
  p.price,
  sum(t.price)::integer as separate_price,
  max(t.turnaround_hours) as turnaround_hours,
  bool_and(t.home_collection) and exists (
    select 1 from public.lab_collection_settings s
    where s.lab_id = p.lab_id and s.accepting
  ) as home_collection,
  array_agg(tt.name order by tt.name) as test_names,
  lower(p.name) as search_text
from public.lab_packages p
join public.lab_directory d on d.id = p.lab_id
join public.lab_package_items i on i.package_id = p.id
join public.lab_tests t on t.id = i.lab_test_id
join public.lab_test_types tt on tt.id = t.test_type_id
where p.listed
group by p.id, d.lab_name, d.address
having bool_and(t.listed);
