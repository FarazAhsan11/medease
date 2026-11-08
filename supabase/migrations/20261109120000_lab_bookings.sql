-- MedEase: lab booking (LAB-03). Safe to run more than once. Run after the home
-- collection migration.
--
-- A patient books tests and packages at one lab, for themselves or a family
-- member, as a lab visit on a day or a home collection in a window. Everything
-- the lab and patient see is copied onto the booking, so later edits to the
-- catalog, an address or a family member never change an order already placed.
-- Design: docs/lab-booking.md.

-- Bookings ----------------------------------------------------------------------------

create table if not exists public.lab_bookings (
  id uuid primary key default gen_random_uuid(),
  -- Made by the form when it opens; the same request books once.
  request_id uuid not null,
  patient_id uuid not null references auth.users (id) on delete cascade,
  care_recipient_id uuid not null,
  lab_id uuid not null references public.lab_profiles (id) on delete cascade,
  status text not null default 'booked' check (status in (
    'booked', 'sample_collected', 'processing', 'report_ready', 'cancelled',
    'recollection_needed'
  )),
  collection text not null check (collection in ('lab', 'home')),
  -- The lab's local day: the visit day, or the day of the collection window.
  visit_date date not null,
  slot_starts_at timestamptz,
  slot_ends_at timestamptz,
  timezone text not null default 'Asia/Karachi',

  lab_name text not null,
  lab_address text not null,
  lab_phone text not null,
  -- The account holder, who booked.
  patient_name text not null,
  patient_phone text,
  -- The person tested. Labs need age and sex for reference ranges.
  care_recipient_name text not null,
  care_recipient_relation text not null
    check (care_recipient_relation in ('self', 'child', 'parent', 'spouse', 'sibling', 'other')),
  care_recipient_date_of_birth date,
  care_recipient_gender text,

  -- Home collection only: where the collector goes and who to call.
  street_address text,
  area text,
  city text,
  landmark text,
  contact_name text,
  contact_phone text,

  subtotal integer not null check (subtotal between 1 and 20000000),
  collection_fee integer not null default 0 check (collection_fee between 0 and 10000),
  total integer not null,
  payment_method text not null default 'cash' check (payment_method in ('cash')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (patient_id, request_id),
  -- Lets items name their booking, lab and patient together.
  unique (id, lab_id, patient_id),
  check (total = subtotal + collection_fee),
  check (
    (collection = 'lab'
      and slot_starts_at is null and slot_ends_at is null
      and street_address is null and city is null and collection_fee = 0)
    or
    (collection = 'home'
      and slot_starts_at is not null and slot_ends_at > slot_starts_at
      and street_address is not null and area is not null and city is not null
      and contact_phone is not null)
  )
);

-- The person tested belongs to the account that booked, checked at commit so an
-- account can be deleted with its people and bookings in one go.
alter table public.lab_bookings
  drop constraint if exists lab_bookings_care_recipient_fkey;
alter table public.lab_bookings
  add constraint lab_bookings_care_recipient_fkey
    foreign key (care_recipient_id, patient_id)
    references public.care_recipients (id, account_id)
    deferrable initially deferred;

-- The patient's list, newest first; also serves the open-bookings count.
create index if not exists lab_bookings_patient_idx
  on public.lab_bookings (patient_id, created_at desc);
-- The lab's list, by day.
create index if not exists lab_bookings_lab_day_idx
  on public.lab_bookings (lab_id, visit_date, slot_starts_at);
-- Visits left in a collection window.
create index if not exists lab_bookings_slot_idx
  on public.lab_bookings (lab_id, slot_starts_at)
  where collection = 'home' and status <> 'cancelled';
create index if not exists lab_bookings_care_recipient_idx
  on public.lab_bookings (care_recipient_id);

-- Items ---------------------------------------------------------------------------------

create table if not exists public.lab_booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  -- Copied from the booking so row-level security reads each row directly.
  lab_id uuid not null,
  patient_id uuid not null,
  -- Checked at commit: deleting a lab's account removes its tests and its
  -- bookings in one cascade, and a check mid-cascade would see the items.
  lab_test_id uuid references public.lab_tests (id) deferrable initially deferred,
  package_id uuid references public.lab_packages (id) deferrable initially deferred,
  -- The test's shared id, for a single test.
  test_type_id text references public.lab_test_types (id),
  name text not null,
  price integer not null check (price between 1 and 1000000),
  -- The single test's name, or every test in the package.
  test_names text[] not null check (cardinality(test_names) between 1 and 30),
  created_at timestamptz not null default now(),
  foreign key (booking_id, lab_id, patient_id)
    references public.lab_bookings (id, lab_id, patient_id) on delete cascade,
  check (num_nonnulls(lab_test_id, package_id) = 1),
  check ((lab_test_id is null) = (test_type_id is null))
);

create index if not exists lab_booking_items_booking_idx
  on public.lab_booking_items (booking_id);
create index if not exists lab_booking_items_package_idx
  on public.lab_booking_items (package_id) where package_id is not null;
create index if not exists lab_booking_items_test_idx
  on public.lab_booking_items (lab_test_id) where lab_test_id is not null;

-- Privileges: patients and labs read their own; every write goes through
-- book_lab_test. Clinical data, so reads and writes need a second factor.

drop trigger if exists set_updated_at on public.lab_bookings;
create trigger set_updated_at
  before update on public.lab_bookings
  for each row execute function public.set_updated_at();

do $$
declare
  v_table text;
begin
  foreach v_table in array array['lab_bookings', 'lab_booking_items']
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format(
      'revoke all on public.%I from public, anon, authenticated, service_role',
      v_table
    );
    execute format('grant select on public.%I to authenticated', v_table);

    execute format('drop policy if exists "Patients read their lab bookings" on public.%I', v_table);
    execute format(
      'create policy "Patients read their lab bookings" on public.%I
         for select to authenticated
         using (patient_id = (select auth.uid()))',
      v_table
    );

    execute format('drop policy if exists "Labs read their bookings" on public.%I', v_table);
    execute format(
      'create policy "Labs read their bookings" on public.%I
         for select to authenticated
         using (lab_id = (select auth.uid()))',
      v_table
    );

    execute format('drop policy if exists "Clinical data needs a second factor" on public.%I', v_table);
    execute format(
      'create policy "Clinical data needs a second factor" on public.%I
         as restrictive
         for all to authenticated
         using ((select private.second_factor_ok()))
         with check ((select private.second_factor_ok()))',
      v_table
    );

    execute format('drop trigger if exists require_second_factor on public.%I', v_table);
    execute format(
      'create trigger require_second_factor
         before insert or update or delete on public.%I
         for each statement execute function private.require_second_factor()',
      v_table
    );
  end loop;
end;
$$;

-- Test names in the lab's catalog, for the booking page ------------------------------
-- Same view, plus the test's name at the end.

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
  coalesce(t.preparation, tt.preparation) as preparation,
  tt.name as test_name
from public.lab_tests t
join public.lab_directory d on d.id = t.lab_id
join public.lab_test_types tt on tt.id = t.test_type_id
where t.listed;

-- Collection windows, less the visits already booked ---------------------------------

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
  ),
  booked as (
    select b.slot_starts_at, count(*)::integer as visits
    from public.lab_bookings b
    where b.lab_id = p_lab_id
      and b.collection = 'home'
      and b.status <> 'cancelled'
      and b.slot_starts_at >= now()
    group by b.slot_starts_at
  )
  select
    s.starts_at,
    s.starts_at + s.step,
    greatest(s.capacity - coalesce(b.visits, 0), 0)::integer
  from slots s
  left join booked b on b.slot_starts_at = s.starts_at
  where s.starts_at >= now() + s.notice
  order by s.starts_at;
$$;

-- Signed in only now that it counts bookings: guests don't book, and the
-- spots left would show a lab's volume to anyone.
revoke execute on function public.get_lab_collection_slots(uuid, integer) from public, anon;
grant execute on function public.get_lab_collection_slots(uuid, integer) to authenticated;

-- Booking ---------------------------------------------------------------------------------
-- p_collection 'lab' takes p_visit_date (today to 13 days ahead, lab time);
-- 'home' takes p_slot_starts_at and p_address_id. Returns the booking's id, or
-- the id of the booking this request already made.

create or replace function public.book_lab_test(
  p_request_id uuid,
  p_lab_id uuid,
  p_lab_test_ids uuid[],
  p_package_ids uuid[],
  p_collection text,
  p_visit_date date default null,
  p_slot_starts_at timestamptz default null,
  p_address_id uuid default null,
  p_care_recipient_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := auth.uid();
  v_timezone constant text := 'Asia/Karachi';
  v_test_ids uuid[] := coalesce(p_lab_test_ids, '{}');
  v_package_ids uuid[] := coalesce(p_package_ids, '{}');
  v_today date := (now() at time zone v_timezone)::date;
  v_existing uuid;
  v_recipient public.care_recipients;
  v_lab record;
  v_items jsonb;
  v_subtotal integer;
  v_all_home boolean;
  v_address public.patient_addresses;
  v_settings public.lab_collection_settings;
  v_area_fee integer;
  v_slot record;
  v_slot_starts_at timestamptz;
  v_slot_ends_at timestamptz;
  v_visit_date date;
  v_fee integer := 0;
  v_patient_name text;
  v_patient_phone text;
  v_booking_id uuid;
begin
  if v_patient_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if p_request_id is null or p_collection is null or p_collection not in ('lab', 'home') then
    raise exception 'invalid_booking';
  end if;

  -- The same request again: hand back what it booked.
  select id into v_existing from public.lab_bookings
  where patient_id = v_patient_id and request_id = p_request_id;
  if found then
    return v_existing;
  end if;

  if cardinality(v_test_ids) + cardinality(v_package_ids) not between 1 and 20
    or array_position(v_test_ids, null) is not null
    or array_position(v_package_ids, null) is not null
    or (select count(distinct x) from unnest(v_test_ids) x) <> cardinality(v_test_ids)
    or (select count(distinct x) from unnest(v_package_ids) x) <> cardinality(v_package_ids) then
    raise exception 'invalid_items';
  end if;

  if p_care_recipient_id is null then
    select * into v_recipient from public.care_recipients
    where id = private.self_care_recipient(v_patient_id);
  else
    select * into v_recipient from public.care_recipients
    where id = p_care_recipient_id and account_id = v_patient_id;
  end if;
  if v_recipient.id is null then
    raise exception 'invalid_care_recipient';
  end if;

  select id, lab_name, address, phone into v_lab
  from public.lab_directory where id = p_lab_id;
  if not found then
    raise exception 'lab_not_found';
  end if;

  -- Every item listed at this lab. Packages read through the patient view, which
  -- also hides a package with an unlisted test.
  select coalesce(jsonb_agg(item), '[]'::jsonb) into v_items
  from (
    select
      t.id as lab_test_id,
      null::uuid as package_id,
      t.test_type_id,
      tt.name,
      t.price,
      array[tt.name] as test_names,
      array[t.test_type_id] as type_ids,
      t.home_collection as home
    from public.lab_tests t
    join public.lab_test_types tt on tt.id = t.test_type_id
    where t.id = any (v_test_ids) and t.lab_id = p_lab_id and t.listed
    union all
    select
      null::uuid,
      p.id,
      null::text,
      p.name,
      p.price,
      p.test_names,
      (
        select array_agg(t.test_type_id)
        from public.lab_package_items i
        join public.lab_tests t on t.id = i.lab_test_id
        where i.package_id = p.id
      ),
      p.home_collection
    from public.lab_package_offers p
    where p.id = any (v_package_ids) and p.lab_id = p_lab_id
  ) as item;

  if jsonb_array_length(v_items) <> cardinality(v_test_ids) + cardinality(v_package_ids) then
    raise exception 'item_unavailable';
  end if;

  -- One draw per test, whether ordered alone or inside a package.
  if exists (
    select 1
    from jsonb_array_elements(v_items) as e,
         jsonb_array_elements_text(e -> 'type_ids') as type_id
    group by type_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_test';
  end if;

  select sum((e ->> 'price')::integer), bool_and((e ->> 'home')::boolean)
    into v_subtotal, v_all_home
  from jsonb_array_elements(v_items) as e;

  -- A stop for a runaway script, well above any family's needs. Counts
  -- visits still to come, so bookings left behind on past days free up.
  if (
    select count(*) from public.lab_bookings
    where patient_id = v_patient_id
      and status = 'booked'
      and visit_date >= v_today
  ) >= 20 then
    raise exception 'too_many_bookings';
  end if;

  if p_collection = 'lab' then
    if p_visit_date is null or p_visit_date not between v_today and v_today + 13 then
      raise exception 'invalid_visit_date';
    end if;
    v_visit_date := p_visit_date;
  else
    select * into v_settings from public.lab_collection_settings
    where lab_id = p_lab_id and accepting;
    if not found then
      raise exception 'not_collecting';
    end if;
    if not v_all_home then
      raise exception 'no_home_collection';
    end if;

    select * into v_address from public.patient_addresses
    where id = p_address_id and account_id = v_patient_id;
    if not found then
      raise exception 'invalid_address';
    end if;

    select fee into v_area_fee from public.lab_service_areas
    where lab_id = p_lab_id and city = v_address.city;
    if not found then
      raise exception 'area_not_served';
    end if;
    v_fee := case
      when v_settings.free_above is not null and v_subtotal >= v_settings.free_above then 0
      else v_area_fee
    end;

    -- One booking at a time per window, so two patients can't both take the
    -- last visit. Released at commit or rollback.
    perform pg_advisory_xact_lock(
      -- Epoch seconds, not the timestamp's text, which follows the session's
      -- time zone and would give the same window different keys.
      hashtextextended(
        'lab_slot:' || p_lab_id::text || ':'
          || extract(epoch from p_slot_starts_at)::bigint::text,
        0
      )
    );

    select * into v_slot
    from public.get_lab_collection_slots(p_lab_id, 14) s
    where s.starts_at = p_slot_starts_at;
    if not found then
      raise exception 'slot_unavailable';
    end if;
    if v_slot.spots_left < 1 then
      raise exception 'slot_full';
    end if;
    v_slot_starts_at := v_slot.starts_at;
    v_slot_ends_at := v_slot.ends_at;
    v_visit_date := (v_slot_starts_at at time zone v_settings.timezone)::date;
  end if;

  select trim(p.first_name || ' ' || p.last_name), p.phone
    into v_patient_name, v_patient_phone
  from public.patient_profiles p where p.id = v_patient_id;

  select coalesce(v_patient_name, u.raw_user_meta_data ->> 'full_name', u.email)
    into v_patient_name
  from auth.users u where u.id = v_patient_id;

  begin
    insert into public.lab_bookings (
      request_id, patient_id, care_recipient_id, lab_id, collection, visit_date,
      slot_starts_at, slot_ends_at, timezone, lab_name, lab_address, lab_phone,
      patient_name, patient_phone, care_recipient_name, care_recipient_relation,
      care_recipient_date_of_birth, care_recipient_gender, street_address, area,
      city, landmark, contact_name, contact_phone, subtotal, collection_fee, total
    ) values (
      p_request_id, v_patient_id, v_recipient.id, p_lab_id, p_collection, v_visit_date,
      v_slot_starts_at, v_slot_ends_at, coalesce(v_settings.timezone, v_timezone),
      v_lab.lab_name, v_lab.address, v_lab.phone,
      v_patient_name, v_patient_phone,
      case
        when v_recipient.relation = 'self' then v_patient_name
        else trim(v_recipient.first_name || ' ' || v_recipient.last_name)
      end,
      v_recipient.relation, v_recipient.date_of_birth, v_recipient.gender,
      v_address.street_address, v_address.area, v_address.city, v_address.landmark,
      v_address.contact_name, v_address.contact_phone,
      v_subtotal, v_fee, v_subtotal + v_fee
    )
    returning id into v_booking_id;
  exception when unique_violation then
    -- The same request, sent twice at once: the other one booked it.
    select id into v_booking_id from public.lab_bookings
    where patient_id = v_patient_id and request_id = p_request_id;
    return v_booking_id;
  end;

  insert into public.lab_booking_items (
    booking_id, lab_id, patient_id, lab_test_id, package_id, test_type_id, name,
    price, test_names
  )
  select
    v_booking_id, p_lab_id, v_patient_id,
    (e ->> 'lab_test_id')::uuid,
    (e ->> 'package_id')::uuid,
    e ->> 'test_type_id',
    e ->> 'name',
    (e ->> 'price')::integer,
    array(select jsonb_array_elements_text(e -> 'test_names'))
  from jsonb_array_elements(v_items) as e;

  return v_booking_id;
end;
$$;

revoke execute on function public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid) from public, anon;
grant execute on function public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid) to authenticated;

-- Notices -----------------------------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'appointment_booked', 'appointment_new', 'appointment_cancelled',
    'appointment_reminder', 'prescription_issued', 'prescription_updated',
    'prescription_cancelled', 'verification_approved',
    'verification_needs_info', 'verification_rejected',
    'visit_summary_ready', 'visit_summary_updated',
    'lab_booking_booked', 'lab_booking_new'
  ));

create or replace function private.notify_lab_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(new.patient_id, 'lab_booking_booked', '/patient/lab-tests');
  perform private.notify(new.lab_id, 'lab_booking_new', '/lab/bookings');
  return null;
end;
$$;

revoke execute on function private.notify_lab_booking() from public;

drop trigger if exists notify_lab_booking on public.lab_bookings;
create trigger notify_lab_booking
  after insert on public.lab_bookings
  for each row execute function private.notify_lab_booking();

-- A booked package stays: the lab unlists it instead ----------------------------------------

create or replace function public.delete_lab_package(p_package_id uuid)
returns void
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
$$;

revoke execute on function public.delete_lab_package(uuid) from public, anon;
grant execute on function public.delete_lab_package(uuid) to authenticated;

-- A family member with lab bookings stays, like one with visits ---------------------------

create or replace function public.delete_family_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if not exists (
    select 1 from public.care_recipients
    where id = p_id and account_id = v_uid and relation <> 'self'
  ) then
    raise exception 'family_member_not_found';
  end if;

  if exists (select 1 from public.appointments where care_recipient_id = p_id)
    or exists (select 1 from public.prescriptions where care_recipient_id = p_id)
    or exists (select 1 from public.visit_summaries where care_recipient_id = p_id)
    or exists (select 1 from public.patient_documents where care_recipient_id = p_id)
    or exists (select 1 from public.lab_bookings where care_recipient_id = p_id) then
    raise exception 'family_member_has_records';
  end if;

  delete from public.care_recipients where id = p_id and account_id = v_uid;
end;
$$;

revoke execute on function public.delete_family_member(uuid) from public, anon;
grant execute on function public.delete_family_member(uuid) to authenticated;
