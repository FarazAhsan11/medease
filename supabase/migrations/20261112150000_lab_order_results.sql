-- MedEase: doctor-ordered tests reach the doctor (LAB-08). Safe to run more than
-- once. Run after the lab orders migration.
--
-- A booking made from a doctor's lab order points back at it and records which
-- of the ordered tests it covers. Those tests stop showing as still to book,
-- and the order can't drop them or be cancelled while the booking stands. The
-- report goes to the ordering doctor, who is told, opens it, and can leave a
-- comment the patient sees. Design: docs/lab-orders.md ("Results").

-- Bookings point at the order ------------------------------------------------------
-- ordered_test_ids: the order's tests this booking covers, by lab_test_types id,
-- whether booked alone or inside a package. Kept if the order is ever deleted,
-- as history. The lab reads its bookings, so the row names the order, never the
-- doctor: the doctor is found through the order, which the lab can't read.

alter table public.lab_bookings add column if not exists lab_order_id uuid;
alter table public.lab_bookings add column if not exists ordered_test_ids text[];

-- The order belongs to the booking's patient.
alter table public.lab_bookings drop constraint if exists lab_bookings_lab_order_fkey;
alter table public.lab_bookings drop constraint if exists lab_bookings_lab_order_id_fkey;
alter table public.lab_orders drop constraint if exists lab_orders_patient_key;
alter table public.lab_orders add constraint lab_orders_patient_key
  unique (id, patient_id);

alter table public.lab_bookings add constraint lab_bookings_lab_order_fkey
  foreign key (lab_order_id, patient_id)
  references public.lab_orders (id, patient_id)
  on delete set null (lab_order_id);

alter table public.lab_bookings drop constraint if exists lab_bookings_lab_order_check;
alter table public.lab_bookings add constraint lab_bookings_lab_order_check
  check (
    (ordered_test_ids is null or cardinality(ordered_test_ids) between 1 and 20)
    and (lab_order_id is null or ordered_test_ids is not null)
  );

-- What's booked from an order, and the patient's view of it.
create index if not exists lab_bookings_lab_order_idx
  on public.lab_bookings (lab_order_id) where lab_order_id is not null;

-- Reports go to the ordering doctor ------------------------------------------------
-- Copied from the order so row level security reads each row directly.

alter table public.lab_reports add column if not exists ordering_doctor_id uuid
  references public.doctor_profiles (id) on delete set null;

-- The doctor's results, newest first (the results inbox, PRC-11).
create index if not exists lab_reports_ordering_doctor_idx
  on public.lab_reports (ordering_doctor_id, created_at desc)
  where ordering_doctor_id is not null and replaced_at is null;

drop policy if exists "Ordering doctors read their reports" on public.lab_reports;
create policy "Ordering doctors read their reports" on public.lab_reports
  for select to authenticated
  using (ordering_doctor_id = (select auth.uid()));

-- Every report row, first or corrected, goes to the booking's ordering doctor,
-- who gets a notice linking to the visit's lab tests.
create or replace function private.route_lab_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
begin
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

revoke execute on function private.route_lab_report() from public;

drop trigger if exists route_lab_report on public.lab_reports;
create trigger route_lab_report
  before insert on public.lab_reports
  for each row execute function private.route_lab_report();

-- The doctor's review ---------------------------------------------------------------
-- One per booking: when the ordering doctor reviewed the report and the comment
-- the patient sees. The doctor's name is copied for the patient's screens.

create table if not exists public.lab_result_reviews (
  booking_id uuid primary key references public.lab_bookings (id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  doctor_name text not null,
  comment text check (char_length(comment) between 1 and 1000),
  commented_at timestamptz,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_result_reviews_commented_at
    check ((comment is null) = (commented_at is null))
);

create index if not exists lab_result_reviews_doctor_idx
  on public.lab_result_reviews (doctor_id, reviewed_at desc);
create index if not exists lab_result_reviews_patient_idx
  on public.lab_result_reviews (patient_id);

drop trigger if exists set_updated_at on public.lab_result_reviews;
create trigger set_updated_at before update on public.lab_result_reviews
  for each row execute function public.set_updated_at();

-- Read only: every write goes through review_lab_result.
alter table public.lab_result_reviews enable row level security;
revoke all on public.lab_result_reviews from anon, authenticated;
grant select on public.lab_result_reviews to authenticated;
grant all on public.lab_result_reviews to service_role;

drop policy if exists "Patients and doctors read their result reviews" on public.lab_result_reviews;
create policy "Patients and doctors read their result reviews" on public.lab_result_reviews
  for select to authenticated
  using ((select auth.uid()) in (patient_id, doctor_id));

drop policy if exists "Clinical data needs a second factor" on public.lab_result_reviews;
create policy "Clinical data needs a second factor" on public.lab_result_reviews
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.lab_result_reviews;
create trigger require_second_factor
  before insert or update or delete on public.lab_result_reviews
  for each statement execute function private.require_second_factor();

-- Notices --------------------------------------------------------------------------

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
    'lab_result_ready', 'lab_result_comment'
  ));

-- Booking from an order ----------------------------------------------------------------
-- As in the payments migration, plus p_lab_order_id: the booking links to the
-- patient's active order when it's for the order's person and covers at least
-- one ordered test not already booked. Otherwise it's an ordinary booking: the
-- patient may book other tests, or for someone else, from the same page.

drop function if exists public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid, text);

create or replace function public.book_lab_test(
  p_request_id uuid,
  p_lab_id uuid,
  p_lab_test_ids uuid[],
  p_package_ids uuid[],
  p_collection text,
  p_visit_date date default null,
  p_slot_starts_at timestamptz default null,
  p_address_id uuid default null,
  p_care_recipient_id uuid default null,
  p_payment_method text default 'cash',
  p_lab_order_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := auth.uid();
  v_timezone constant text := 'Asia/Karachi';
  v_hold constant interval := interval '15 minutes';
  v_test_ids uuid[] := coalesce(p_lab_test_ids, '{}');
  v_package_ids uuid[] := coalesce(p_package_ids, '{}');
  v_today date := (now() at time zone v_timezone)::date;
  v_online boolean := p_payment_method = 'online';
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
  v_order public.lab_orders;
  v_ordered text[];
begin
  if v_patient_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if p_request_id is null or p_collection is null or p_collection not in ('lab', 'home')
    or p_payment_method is null or p_payment_method not in ('cash', 'online') then
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

  -- The doctor's order this books, if any. Locked until commit, so the doctor
  -- can't drop these tests or cancel the order meanwhile, and two bookings
  -- from the same order take turns.
  if p_lab_order_id is not null then
    select * into v_order from public.lab_orders
    where id = p_lab_order_id and patient_id = v_patient_id
    for no key update;

    if found and v_order.status = 'active'
      and v_order.care_recipient_id = v_recipient.id then
      select array_agg(i.test_type_id order by i.test_type_id) into v_ordered
      from public.lab_order_items i
      where i.order_id = v_order.id
        and i.test_type_id in (
          select jsonb_array_elements_text(e -> 'type_ids')
          from jsonb_array_elements(v_items) as e
        )
        and not exists (
          select 1 from public.lab_bookings b
          where b.lab_order_id = v_order.id
            and b.status <> 'cancelled'
            and i.test_type_id = any (b.ordered_test_ids)
        );
    end if;
  end if;

  select sum((e ->> 'price')::integer), bool_and((e ->> 'home')::boolean)
    into v_subtotal, v_all_home
  from jsonb_array_elements(v_items) as e;

  -- A stop for a runaway script, well above any family's needs. Counts
  -- visits still to come, held ones included, so bookings left behind on
  -- past days free up.
  if (
    select count(*) from public.lab_bookings
    where patient_id = v_patient_id
      and status in ('booked', 'awaiting_payment')
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

    -- Held bookings count, so nobody takes the spot while the patient pays.
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
      city, landmark, contact_name, contact_phone, subtotal, collection_fee, total,
      status, payment_method, payment_due_at, confirmed_at, lab_order_id,
      ordered_test_ids
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
      v_subtotal, v_fee, v_subtotal + v_fee,
      case when v_online then 'awaiting_payment' else 'booked' end,
      p_payment_method,
      case when v_online then now() + v_hold end,
      case when v_online then null else now() end,
      case when v_ordered is not null then v_order.id end,
      v_ordered
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

revoke execute on function public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid, text, uuid) from public, anon;
grant execute on function public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid, text, uuid) to authenticated;

-- Changing an order that's been booked ----------------------------------------------------
-- A booking that wasn't cancelled holds its tests: the order can add tests, or
-- change the priority and note, but not drop a booked test or be cancelled.
-- Latest version before this: 20261112120000_lab_orders.sql.

create or replace function public.save_lab_order(
  p_appointment_id uuid,
  p_test_ids text[],
  p_priority text default 'routine',
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_appointment public.appointments;
  v_order public.lab_orders;
  v_note text := nullif(btrim(p_note), '');
  v_issued boolean := false;
  v_changed boolean := false;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;

  -- Locking the appointment makes concurrent saves for it take turns.
  select * into v_appointment from public.appointments
  where id = p_appointment_id and doctor_id = v_uid
  for update;

  if not found then
    raise exception 'appointment_not_found';
  end if;
  if v_appointment.status = 'cancelled' then
    raise exception 'appointment_cancelled';
  end if;
  if v_appointment.status = 'no_show' then
    raise exception 'appointment_no_show';
  end if;
  if v_appointment.starts_at > now() then
    raise exception 'lab_order_not_started';
  end if;
  if now() > v_appointment.starts_at + interval '14 days' then
    raise exception 'lab_order_window_closed';
  end if;

  if coalesce(cardinality(p_test_ids), 0) not between 1 and 20
    or (select count(distinct test_id) from unnest(p_test_ids) as test_id)
      <> cardinality(p_test_ids)
    or (select count(*) from public.lab_test_types where id = any(p_test_ids))
      <> cardinality(p_test_ids)
    or p_priority is null
    or p_priority not in ('routine', 'urgent')
    or char_length(v_note) > 500 then
    raise exception 'invalid_lab_order';
  end if;

  -- Locked too, so a cancel or a booking running at the same time finishes
  -- first and this save sees it.
  select * into v_order from public.lab_orders
  where appointment_id = v_appointment.id
  for update;

  if not found then
    insert into public.lab_orders (
      appointment_id, doctor_id, patient_id, care_recipient_id, priority, note
    ) values (
      v_appointment.id, v_uid, v_appointment.patient_id,
      v_appointment.care_recipient_id, p_priority, v_note
    )
    returning * into v_order;
    v_issued := true;
  else
    if exists (
      select 1 from public.lab_bookings
      where lab_order_id = v_order.id
        and status <> 'cancelled'
        and not (ordered_test_ids <@ p_test_ids)
    ) then
      raise exception 'lab_order_test_booked';
    end if;

    v_issued := v_order.status = 'cancelled';
    update public.lab_orders
    set priority = p_priority, note = v_note, status = 'active', cancelled_at = null
    where id = v_order.id
      and (priority, note, status) is distinct from (p_priority, v_note, 'active');
    v_changed := found;
  end if;

  delete from public.lab_order_items
  where order_id = v_order.id and test_type_id <> all(p_test_ids);
  v_changed := v_changed or found;

  insert into public.lab_order_items (order_id, patient_id, doctor_id, test_type_id, test_name)
  select v_order.id, v_order.patient_id, v_order.doctor_id, t.id, t.name
  from public.lab_test_types t
  where t.id = any(p_test_ids)
  on conflict (order_id, test_type_id) do nothing;
  v_changed := v_changed or found;

  if v_issued then
    perform private.notify(
      v_order.patient_id, 'lab_order_issued', '/patient/lab-tests/orders/' || v_order.id
    );
    perform private.write_audit('lab_order.issued', 'lab_order', v_order.id);
  elsif v_changed then
    -- A change to the tests alone still dates the order.
    update public.lab_orders set updated_at = now() where id = v_order.id;
    perform private.notify(
      v_order.patient_id, 'lab_order_updated', '/patient/lab-tests/orders/' || v_order.id
    );
    perform private.write_audit('lab_order.edited', 'lab_order', v_order.id);
  end if;

  return v_order.id;
end;
$$;

revoke execute on function public.save_lab_order(uuid, text[], text, text) from public, anon;
grant execute on function public.save_lab_order(uuid, text[], text, text) to authenticated;

create or replace function public.cancel_lab_order(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.lab_orders;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;

  select * into v_order from public.lab_orders
  where appointment_id = p_appointment_id and doctor_id = v_uid
  for update;

  if not found then
    raise exception 'lab_order_not_found';
  end if;
  if v_order.status = 'cancelled' then
    return;
  end if;
  if exists (
    select 1 from public.lab_bookings
    where lab_order_id = v_order.id and status <> 'cancelled'
  ) then
    raise exception 'lab_order_booked';
  end if;

  update public.lab_orders
  set status = 'cancelled', cancelled_at = now()
  where id = v_order.id;

  perform private.notify(v_order.patient_id, 'lab_order_cancelled', '/patient/appointments');
  perform private.write_audit('lab_order.cancelled', 'lab_order', v_order.id);
end;
$$;

revoke execute on function public.cancel_lab_order(uuid) from public, anon;
grant execute on function public.cancel_lab_order(uuid) to authenticated;

-- Comparing labs for what's left to book ----------------------------------------------
-- As before, without the tests a booking that wasn't cancelled already covers.
-- The patient reads their bookings through row level security.

create or replace function public.get_lab_order_offers(p_order_id uuid)
returns table (
  lab_id uuid,
  lab_name text,
  lab_address text,
  test_type_ids text[],
  total_price integer,
  turnaround_hours integer,
  home_collection boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    o.lab_id,
    min(o.lab_name),
    min(o.lab_address),
    array_agg(o.test_type_id order by o.test_type_id),
    sum(o.price)::integer,
    max(o.turnaround_hours)::integer,
    bool_and(o.home_collection)
  from public.lab_orders lo
  join public.lab_order_items i on i.order_id = lo.id
  join public.lab_test_offers o on o.test_type_id = i.test_type_id
  where lo.id = p_order_id
    and lo.status = 'active'
    and not exists (
      select 1 from public.lab_bookings b
      where b.lab_order_id = lo.id
        and b.status <> 'cancelled'
        and i.test_type_id = any (b.ordered_test_ids)
    )
  group by o.lab_id
  order by count(*) desc, sum(o.price), min(o.lab_name), o.lab_id
  limit 50;
$$;

revoke execute on function public.get_lab_order_offers(uuid) from public, anon;
grant execute on function public.get_lab_order_offers(uuid) to authenticated;

-- The doctor's view of an order's bookings ---------------------------------------------
-- The doctor can't read lab_bookings, which hold the patient's address and
-- payment; this returns only what the doctor needs, for the order of one of
-- their visits. Cancelled bookings are left out; one still waiting for payment
-- is in, as it holds its tests like the rules above.

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
    r.created_at,
    v.comment,
    v.reviewed_at
  from public.lab_orders o
  join public.lab_bookings b on b.lab_order_id = o.id
  left join public.lab_reports r
    on r.booking_id = b.id and r.replaced_at is null
  left join public.lab_result_reviews v on v.booking_id = b.id
  where o.appointment_id = p_appointment_id
    and o.doctor_id = v_uid
    and b.status <> 'cancelled'
  order by b.created_at;
end;
$$;

revoke execute on function public.get_lab_order_bookings(uuid) from public, anon;
grant execute on function public.get_lab_order_bookings(uuid) to authenticated;

-- Reviewing a result -----------------------------------------------------------------------
-- The ordering doctor marks the report reviewed, with an optional comment of up
-- to 1000 characters for the patient (blank counts as none). A new or changed
-- comment tells the patient; removing it doesn't. Saving the same again is quiet.

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

  select * into v_review from public.lab_result_reviews
  where booking_id = v_booking.id;

  if not found then
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
  elsif v_review.comment is not distinct from v_comment then
    return;
  else
    update public.lab_result_reviews
    set comment = v_comment,
        commented_at = case when v_comment is not null then now() end
    where booking_id = v_booking.id;
  end if;

  if v_comment is not null then
    perform private.notify(v_booking.patient_id, 'lab_result_comment', '/patient/lab-tests');
  end if;
  if v_review.booking_id is not null or v_comment is not null then
    perform private.write_audit('lab_result.commented', 'lab_booking', v_booking.id);
  end if;
end;
$$;

revoke execute on function public.review_lab_result(uuid, text) from public, anon;
grant execute on function public.review_lab_result(uuid, text) to authenticated;
