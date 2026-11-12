-- MedEase: lab orders (RX-04)
--
-- The doctor orders lab tests for the person seen at a visit. One order per
-- appointment, edited in place in the prescription window (from the start of the
-- visit until 14 days after) and cancelled at any time. Tests come from the shared
-- lab_test_types list, so the patient can compare labs for the whole order and
-- book one. Design: docs/lab-orders.md.

create table if not exists public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  care_recipient_id uuid not null,
  priority text not null default 'routine' check (priority in ('routine', 'urgent')),
  note text check (char_length(note) between 1 and 500),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_orders_cancelled_at
    check ((status = 'cancelled') = (cancelled_at is not null)),
  -- Lets each item carry its order's people, checked.
  constraint lab_orders_people_key unique (id, patient_id, doctor_id),
  constraint lab_orders_care_recipient_fkey
    foreign key (care_recipient_id, patient_id)
    references public.care_recipients (id, account_id)
    deferrable initially deferred
);

create index if not exists lab_orders_patient_idx
  on public.lab_orders (patient_id, created_at desc);
create index if not exists lab_orders_doctor_idx
  on public.lab_orders (doctor_id, created_at desc);
create index if not exists lab_orders_care_recipient_idx
  on public.lab_orders (care_recipient_id, created_at desc);

drop trigger if exists set_updated_at on public.lab_orders;
create trigger set_updated_at before update on public.lab_orders
  for each row execute function public.set_updated_at();

-- The name is copied, so a later rename of the test doesn't change the order.
create table if not exists public.lab_order_items (
  order_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  test_type_id text not null references public.lab_test_types (id),
  test_name text not null check (char_length(test_name) between 2 and 120),
  primary key (order_id, test_type_id),
  constraint lab_order_items_order_fkey
    foreign key (order_id, patient_id, doctor_id)
    references public.lab_orders (id, patient_id, doctor_id)
    on delete cascade
);

-- Read only: every write goes through save_lab_order and cancel_lab_order.
alter table public.lab_orders enable row level security;
alter table public.lab_order_items enable row level security;
revoke all on public.lab_orders, public.lab_order_items from anon, authenticated;
grant select on public.lab_orders, public.lab_order_items to authenticated;
grant all on public.lab_orders, public.lab_order_items to service_role;

drop policy if exists "Patients and doctors read their lab orders" on public.lab_orders;
create policy "Patients and doctors read their lab orders" on public.lab_orders
  for select to authenticated
  using ((select auth.uid()) in (patient_id, doctor_id));

drop policy if exists "Patients and doctors read their lab order items" on public.lab_order_items;
create policy "Patients and doctors read their lab order items" on public.lab_order_items
  for select to authenticated
  using ((select auth.uid()) in (patient_id, doctor_id));

drop policy if exists "Clinical data needs a second factor" on public.lab_orders;
create policy "Clinical data needs a second factor" on public.lab_orders
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop policy if exists "Clinical data needs a second factor" on public.lab_order_items;
create policy "Clinical data needs a second factor" on public.lab_order_items
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.lab_orders;
create trigger require_second_factor
  before insert or update or delete on public.lab_orders
  for each statement execute function private.require_second_factor();

drop trigger if exists require_second_factor on public.lab_order_items;
create trigger require_second_factor
  before insert or update or delete on public.lab_order_items
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
    'lab_order_issued', 'lab_order_updated', 'lab_order_cancelled'
  ));

-- Saving ---------------------------------------------------------------------------
-- 1 to 20 known tests without repeats, routine or urgent, a note of up to 500
-- characters (blank counts as none). Saving a cancelled order issues it again;
-- saving the same order again changes nothing and tells nobody.

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

  select * into v_order from public.lab_orders
  where appointment_id = v_appointment.id;

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

-- Cancelling: any time, like a prescription. A second cancel is quiet.

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

  update public.lab_orders
  set status = 'cancelled', cancelled_at = now()
  where id = v_order.id;

  perform private.notify(v_order.patient_id, 'lab_order_cancelled', '/patient/appointments');
  perform private.write_audit('lab_order.cancelled', 'lab_order', v_order.id);
end;
$$;

revoke execute on function public.cancel_lab_order(uuid) from public, anon;
grant execute on function public.cancel_lab_order(uuid) to authenticated;

-- Comparing labs for an order --------------------------------------------------------
-- Runs as the caller, so the order is read through their own row level security,
-- and the offers through the public view (listed tests at listed labs). Filtering
-- the view by the ordered tests keeps it on lab_tests_compare_idx. Labs offering
-- the most tests come first, then the cheapest.

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
  where lo.id = p_order_id and lo.status = 'active'
  group by o.lab_id
  order by count(*) desc, sum(o.price), min(o.lab_name), o.lab_id
  limit 50;
$$;

revoke execute on function public.get_lab_order_offers(uuid) from public, anon;
grant execute on function public.get_lab_order_offers(uuid) to authenticated;
