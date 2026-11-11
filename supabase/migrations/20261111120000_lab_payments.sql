-- MedEase: paying for lab bookings online (PAY-07), with the payment records,
-- webhook events and refund queue from PAY-02. Safe to run more than once. Run
-- after the lab booking changes migration. Design: docs/payments.md.
--
-- An online booking waits in 'awaiting_payment' and holds its spot until it's
-- paid or the hold lapses. Only a signed provider webhook confirms it. The lab
-- sees a booking once it's confirmed. Cancelling a paid booking queues a full
-- refund.

-- Bookings ------------------------------------------------------------------------------

alter table public.lab_bookings add column if not exists payment_due_at timestamptz;
-- When the lab got the booking: at once for cash, on payment for online.
alter table public.lab_bookings add column if not exists confirmed_at timestamptz;
update public.lab_bookings set confirmed_at = created_at
where confirmed_at is null and status <> 'awaiting_payment';

alter table public.lab_bookings drop constraint if exists lab_bookings_status_check;
alter table public.lab_bookings add constraint lab_bookings_status_check
  check (status in (
    'awaiting_payment', 'booked', 'sample_collected', 'processing',
    'report_ready', 'cancelled', 'recollection_needed'
  ));

alter table public.lab_bookings drop constraint if exists lab_bookings_payment_method_check;
alter table public.lab_bookings add constraint lab_bookings_payment_method_check
  check (payment_method in ('cash', 'online'));

alter table public.lab_bookings drop constraint if exists lab_bookings_payment_status_check;
alter table public.lab_bookings add constraint lab_bookings_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'refund_pending', 'refunded'));

-- Cash is never held for payment. Online keeps its due time as history: unpaid
-- while held, paid once confirmed, and any of unpaid, refund pending or
-- refunded once cancelled.
alter table public.lab_bookings drop constraint if exists lab_bookings_payment_check;
alter table public.lab_bookings add constraint lab_bookings_payment_check
  check (
    (payment_method = 'cash'
      and payment_status in ('unpaid', 'paid')
      and payment_due_at is null
      and status <> 'awaiting_payment')
    or
    (payment_method = 'online'
      and payment_due_at is not null
      and (
        (status = 'awaiting_payment' and payment_status = 'unpaid')
        or (status = 'cancelled' and payment_status in ('unpaid', 'refund_pending', 'refunded'))
        or (status not in ('awaiting_payment', 'cancelled') and payment_status = 'paid')
      ))
  );

alter table public.lab_bookings drop constraint if exists lab_bookings_confirmed_check;
alter table public.lab_bookings add constraint lab_bookings_confirmed_check
  check (
    status = 'cancelled'
    or (status = 'awaiting_payment' and confirmed_at is null)
    or (status not in ('awaiting_payment', 'cancelled') and confirmed_at is not null)
  );

-- A lapsed hold is cancelled by the system, with its own reason.
alter table public.lab_bookings drop constraint if exists lab_bookings_cancelled_by_check;
alter table public.lab_bookings add constraint lab_bookings_cancelled_by_check
  check (
    (status = 'cancelled') = (cancelled_by is not null)
    and coalesce(cancelled_by in ('patient', 'lab', 'system'), true)
  );

alter table public.lab_bookings drop constraint if exists lab_bookings_status_reason_check;
alter table public.lab_bookings add constraint lab_bookings_status_reason_check
  check (
    (status = 'recollection_needed' and status_reason in (
      'sample_haemolysed', 'sample_clotted', 'not_enough_sample',
      'label_problem', 'sample_delayed', 'other'
    ))
    or (status = 'cancelled' and coalesce(cancelled_by = 'lab', false) and status_reason in (
      'patient_request', 'patient_unreachable', 'patient_absent',
      'test_unavailable', 'collection_unavailable', 'other'
    ))
    or (status = 'cancelled' and coalesce(cancelled_by = 'patient', false) and status_reason in (
      'no_longer_needed', 'booked_by_mistake', 'another_lab',
      'time_unsuitable', 'other'
    ))
    or (status = 'cancelled' and coalesce(cancelled_by = 'system', false)
      and status_reason = 'payment_not_completed')
    or (status not in ('recollection_needed', 'cancelled') and status_reason is null)
  );

-- Holds to release.
create index if not exists lab_bookings_payment_due_idx
  on public.lab_bookings (payment_due_at)
  where status = 'awaiting_payment';

alter table public.lab_booking_events drop constraint if exists lab_booking_events_status_check;
alter table public.lab_booking_events add constraint lab_booking_events_status_check
  check (status in (
    'awaiting_payment', 'booked', 'sample_collected', 'processing',
    'report_ready', 'cancelled', 'recollection_needed'
  ));

-- The lab reads a booking, its items and its history only once it's confirmed,
-- so an unpaid hold never reaches its lists.
drop policy if exists "Labs read their bookings" on public.lab_bookings;
create policy "Labs read their bookings" on public.lab_bookings
  for select to authenticated
  using (lab_id = (select auth.uid()) and confirmed_at is not null);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['lab_booking_items', 'lab_booking_events']
  loop
    execute format('drop policy if exists "Labs read their bookings" on public.%I', v_table);
    execute format(
      'create policy "Labs read their bookings" on public.%I
         for select to authenticated
         using (
           lab_id = (select auth.uid())
           and exists (
             select 1 from public.lab_bookings b
             where b.id = booking_id and b.confirmed_at is not null
           )
         )',
      v_table
    );
  end loop;
end;
$$;

-- Payments ------------------------------------------------------------------------------
-- One row per checkout attempt. Amounts are whole rupees, like the booking.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  lab_booking_id uuid not null references public.lab_bookings (id) on delete cascade,
  provider text not null check (provider in ('test')),
  -- The provider's checkout id, once the checkout is made.
  provider_ref text check (char_length(provider_ref) between 1 and 200),
  checkout_url text check (char_length(checkout_url) between 1 and 2000),
  amount integer not null check (amount between 1 and 20000000),
  currency text not null default 'PKR' check (currency = 'PKR'),
  status text not null default 'pending' check (status in (
    'pending', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded'
  )),
  refunded_amount integer not null default 0,
  -- What the provider says it took, when that isn't the amount asked for.
  captured_amount integer check (captured_amount between 1 and 20000000),
  failure_code text check (char_length(failure_code) between 1 and 64),
  expires_at timestamptz not null,
  paid_at timestamptz,
  -- Asked about once after it expired, in case a webhook was lost.
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref),
  check (refunded_amount between 0 and coalesce(captured_amount, amount)),
  check ((status in ('paid', 'refunded', 'partially_refunded')) = (paid_at is not null)),
  check ((provider_ref is null) = (checkout_url is null))
);

create index if not exists payments_booking_idx
  on public.payments (lab_booking_id, created_at);
create index if not exists payments_patient_idx
  on public.payments (patient_id);
-- One open attempt per booking.
create unique index if not exists payments_one_open_idx
  on public.payments (lab_booking_id)
  where status = 'pending';
create index if not exists payments_reconcile_idx
  on public.payments (expires_at)
  where status in ('pending', 'expired') and reconciled_at is null;

drop trigger if exists set_updated_at on public.payments;
create trigger set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Provider events applied, each once. No payload: it can hold the payer's details.
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null check (char_length(event_id) between 1 and 200),
  type text not null check (type in (
    'payment.succeeded', 'payment.failed', 'refund.succeeded', 'refund.failed'
  )),
  payment_id uuid references public.payments (id) on delete cascade,
  amount integer,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists payment_events_payment_idx
  on public.payment_events (payment_id);

-- Refunds -------------------------------------------------------------------------------
-- The id is the idempotency key sent to the provider. Refunds are full, so one
-- per payment.

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount between 1 and 20000000),
  reason text not null check (reason in (
    'booking_cancelled', 'late_payment', 'duplicate_payment', 'amount_mismatch'
  )),
  status text not null default 'pending' check (status in (
    'pending', 'submitted', 'succeeded', 'failed'
  )),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  provider_ref text check (char_length(provider_ref) between 1 and 200),
  last_error text check (char_length(last_error) between 1 and 64),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'succeeded') = (completed_at is not null))
);

create index if not exists refunds_due_idx
  on public.refunds (next_attempt_at)
  where status in ('pending', 'submitted');
create index if not exists refunds_patient_idx
  on public.refunds (patient_id);

drop trigger if exists set_updated_at on public.refunds;
create trigger set_updated_at
  before update on public.refunds
  for each row execute function public.set_updated_at();

alter table public.payment_events add column if not exists refund_id uuid
  references public.refunds (id) on delete cascade;
create index if not exists payment_events_refund_idx
  on public.payment_events (refund_id) where refund_id is not null;

-- Privileges: patients read their own payments and refunds, with a second
-- factor like the bookings they pay for. Events are for the functions only.
-- Every write goes through the functions below.

do $$
declare
  v_table text;
begin
  foreach v_table in array array['payments', 'refunds', 'payment_events']
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format(
      'revoke all on public.%I from public, anon, authenticated, service_role',
      v_table
    );
  end loop;

  foreach v_table in array array['payments', 'refunds']
  loop
    execute format('grant select on public.%I to authenticated', v_table);

    execute format('drop policy if exists "Patients read their payments" on public.%I', v_table);
    execute format(
      'create policy "Patients read their payments" on public.%I
         for select to authenticated
         using (patient_id = (select auth.uid()))',
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

-- Booking -------------------------------------------------------------------------------
-- As before, plus p_payment_method: 'cash' books at once, 'online' holds the
-- spot for 15 minutes while the patient pays.

drop function if exists public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid);

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
  p_payment_method text default 'cash'
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
      status, payment_method, payment_due_at, confirmed_at
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
      case when v_online then null else now() end
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

revoke execute on function public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid, text) from public, anon;
grant execute on function public.book_lab_test(uuid, uuid, uuid[], uuid[], text, date, timestamptz, uuid, uuid, text) to authenticated;

-- The patient cancels ---------------------------------------------------------------------
-- As before, and a booking still waiting for payment can be dropped too.
-- Returns whether a refund was queued, so the server sends it straight away.

drop function if exists public.cancel_lab_booking(uuid, text, text);

create or replace function public.cancel_lab_booking(
  p_booking_id uuid,
  p_reason text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := auth.uid();
  v_booking public.lab_bookings;
  v_note text := nullif(
    btrim(replace(coalesce(p_note, ''), E'\r\n', E'\n'), E' \t\n\r'),
    ''
  );
begin
  if v_patient_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if p_booking_id is null then
    raise exception 'booking_not_found';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and patient_id = v_patient_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status = 'cancelled' and v_booking.cancelled_by = 'patient' then
    return false;
  end if;
  if v_booking.status not in ('awaiting_payment', 'booked', 'recollection_needed') then
    raise exception 'not_changeable';
  end if;

  if p_reason is null then
    raise exception 'reason_required';
  end if;
  -- Otherwise the lab would see "other" and nothing more.
  if p_reason = 'other' and v_note is null then
    raise exception 'note_required';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'invalid_note';
  end if;

  begin
    update public.lab_bookings
    set status = 'cancelled',
        status_reason = p_reason,
        status_note = v_note,
        status_changed_at = now(),
        cancelled_by = 'patient'
    where id = v_booking.id;
  exception when check_violation then
    raise exception 'invalid_reason';
  end;

  return v_booking.payment_method = 'online' and v_booking.payment_status = 'paid';
end;
$$;

revoke execute on function public.cancel_lab_booking(uuid, text, text) from public, anon;
grant execute on function public.cancel_lab_booking(uuid, text, text) to authenticated;

-- Cancelling settles the money ------------------------------------------------------------
-- A paid booking that's cancelled, by anyone, is refunded in full; an open
-- checkout for it is closed.

create or replace function private.mark_lab_booking_refund()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled'
    and old.payment_method = 'online' and old.payment_status = 'paid' then
    new.payment_status := 'refund_pending';
  end if;
  return new;
end;
$$;

revoke execute on function private.mark_lab_booking_refund() from public;

drop trigger if exists mark_lab_booking_refund on public.lab_bookings;
create trigger mark_lab_booking_refund
  before update of status on public.lab_bookings
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled')
  execute function private.mark_lab_booking_refund();

create or replace function private.settle_cancelled_lab_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments
  set status = 'expired'
  where lab_booking_id = new.id and status = 'pending';

  insert into public.refunds (payment_id, patient_id, amount, reason)
  select p.id, p.patient_id, p.amount, 'booking_cancelled'
  from public.payments p
  where p.lab_booking_id = new.id and p.status = 'paid'
  on conflict (payment_id) do nothing;

  return null;
end;
$$;

revoke execute on function private.settle_cancelled_lab_booking() from public;

drop trigger if exists settle_cancelled_lab_booking on public.lab_bookings;
create trigger settle_cancelled_lab_booking
  after update of status on public.lab_bookings
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled')
  execute function private.settle_cancelled_lab_booking();

-- Starting a payment ----------------------------------------------------------------------
-- The patient, for their own booking while it's held. Hands back the open
-- attempt if its checkout exists, so a second click reuses it; otherwise a new
-- attempt, whose checkout the server then makes with the provider.

create or replace function public.start_lab_payment(
  p_booking_id uuid,
  p_provider text
)
returns table (payment_id uuid, amount integer, expires_at timestamptz, checkout_url text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_patient_id uuid := auth.uid();
  v_booking public.lab_bookings;
  v_open public.payments;
  v_payment public.payments;
begin
  if v_patient_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if p_provider is null or p_provider not in ('test') then
    raise exception 'invalid_provider';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and patient_id = v_patient_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status <> 'awaiting_payment' then
    if v_booking.payment_status = 'paid' then
      raise exception 'already_paid';
    end if;
    raise exception 'not_awaiting_payment';
  end if;

  -- Leaves at least a minute to pay.
  if v_booking.payment_due_at <= now() + interval '1 minute' then
    raise exception 'payment_window_closed';
  end if;

  select * into v_open
  from public.payments p
  where p.lab_booking_id = v_booking.id and p.status = 'pending'
  for update;

  if found then
    if v_open.checkout_url is not null and v_open.provider = p_provider then
      return query select v_open.id, v_open.amount, v_open.expires_at, v_open.checkout_url;
      return;
    end if;
    -- Another click is still making its checkout.
    if v_open.checkout_url is null and v_open.created_at > now() - interval '1 minute' then
      raise exception 'payment_in_progress';
    end if;
    update public.payments
    set status = 'failed', failure_code = 'checkout_not_created'
    where id = v_open.id;
  end if;

  if (
    select count(*) from public.payments p where p.lab_booking_id = v_booking.id
  ) >= 5 then
    raise exception 'too_many_attempts';
  end if;

  insert into public.payments (patient_id, lab_booking_id, provider, amount, expires_at)
  values (v_patient_id, v_booking.id, p_provider, v_booking.total, v_booking.payment_due_at)
  returning * into v_payment;

  return query select v_payment.id, v_payment.amount, v_payment.expires_at, null::text;
end;
$$;

revoke execute on function public.start_lab_payment(uuid, text) from public, anon;
grant execute on function public.start_lab_payment(uuid, text) to authenticated;

-- The server stores the checkout the provider made. Secret key only, so a
-- patient can't point an attempt at someone else's checkout.
create or replace function public.attach_payment_checkout(
  p_payment_id uuid,
  p_provider_ref text,
  p_checkout_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_payment_id is null
    or coalesce(char_length(p_provider_ref), 0) not between 1 and 200
    or coalesce(char_length(p_checkout_url), 0) not between 1 and 2000 then
    raise exception 'invalid_checkout';
  end if;

  update public.payments
  set provider_ref = p_provider_ref, checkout_url = p_checkout_url
  where id = p_payment_id and status = 'pending' and provider_ref is null;

  if not found then
    raise exception 'payment_not_open';
  end if;
end;
$$;

revoke execute on function public.attach_payment_checkout(uuid, text, text) from public, anon, authenticated;
grant execute on function public.attach_payment_checkout(uuid, text, text) to service_role;

-- Refunds complete -------------------------------------------------------------------------

create or replace function private.complete_refund(p_refund_id uuid, p_provider_ref text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_booking_id uuid;
begin
  update public.refunds
  set status = 'succeeded',
      completed_at = now(),
      provider_ref = coalesce(p_provider_ref, provider_ref),
      last_error = null
  where id = p_refund_id and status <> 'succeeded'
  returning * into v_refund;

  if not found then
    return;
  end if;

  update public.payments
  set status = 'refunded', refunded_amount = v_refund.amount
  where id = v_refund.payment_id
  returning lab_booking_id into v_booking_id;

  -- The booking is refunded once nothing paid for it is still owed back.
  update public.lab_bookings b
  set payment_status = 'refunded'
  where b.id = v_booking_id
    and b.payment_status = 'refund_pending'
    and not exists (
      select 1 from public.refunds r
      join public.payments p on p.id = r.payment_id
      where p.lab_booking_id = b.id and r.status <> 'succeeded'
    );

  perform private.notify(v_refund.patient_id, 'lab_booking_refunded', '/patient/lab-tests');
end;
$$;

revoke execute on function private.complete_refund(uuid, text) from public;

-- Provider events ---------------------------------------------------------------------------
-- From the webhook (and reconciling), after the server checked the signature.
-- Each event applies once. Returns what happened, for the response.

create or replace function public.record_payment_event(
  p_provider text,
  p_event_id text,
  p_type text,
  p_provider_ref text default null,
  p_amount integer default null,
  p_refund_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id bigint;
  v_booking_id uuid;
  v_payment public.payments;
  v_booking public.lab_bookings;
  v_refund public.refunds;
begin
  if p_provider is null or p_event_id is null or p_type is null
    or p_type not in ('payment.succeeded', 'payment.failed', 'refund.succeeded', 'refund.failed') then
    raise exception 'invalid_event';
  end if;

  insert into public.payment_events (provider, event_id, type, amount)
  values (p_provider, p_event_id, p_type, p_amount)
  on conflict (provider, event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return 'duplicate';
  end if;

  -- Locks go booking, then payment, then refund: the same order as cancelling
  -- and releasing holds, so they wait for each other instead of deadlocking.
  if p_type in ('refund.succeeded', 'refund.failed') then
    select p.lab_booking_id into v_booking_id
    from public.refunds r
    join public.payments p on p.id = r.payment_id
    where r.id = p_refund_id and p.provider = p_provider;

    if not found then
      raise exception 'refund_not_found';
    end if;
    perform 1 from public.lab_bookings where id = v_booking_id for update;
    select * into v_refund from public.refunds where id = p_refund_id for update;
    if p_amount is distinct from v_refund.amount then
      raise exception 'amount_mismatch';
    end if;

    update public.payment_events
    set payment_id = v_refund.payment_id, refund_id = v_refund.id
    where id = v_event_id;

    -- A refund given up on can still turn out to have gone through.
    if v_refund.status = 'succeeded'
      or (p_type = 'refund.failed' and v_refund.status = 'failed') then
      return 'ignored';
    end if;

    if p_type = 'refund.succeeded' then
      perform private.complete_refund(v_refund.id, p_provider_ref);
      return 'refunded';
    end if;

    -- The provider turned it down: an admin settles it (ADM-09).
    update public.refunds
    set status = 'failed', last_error = 'provider_declined'
    where id = v_refund.id;
    return 'refund_failed';
  end if;

  select lab_booking_id into v_booking_id
  from public.payments
  where provider = p_provider and provider_ref = p_provider_ref;

  if not found then
    raise exception 'payment_not_found';
  end if;

  select * into v_booking from public.lab_bookings where id = v_booking_id for update;
  select * into v_payment
  from public.payments
  where provider = p_provider and provider_ref = p_provider_ref
  for update;

  update public.payment_events set payment_id = v_payment.id where id = v_event_id;

  if p_type = 'payment.failed' then
    if v_payment.status <> 'pending' then
      return 'ignored';
    end if;
    update public.payments
    set status = 'failed', failure_code = 'provider_declined'
    where id = v_payment.id;
    return 'failed';
  end if;

  -- Succeeded. A failed or expired attempt can still turn out paid.
  if v_payment.status in ('paid', 'refunded', 'partially_refunded') then
    return 'ignored';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 20000000 then
    raise exception 'invalid_event';
  end if;

  -- Money was taken either way. Not the amount asked for: all of it goes
  -- back, and the booking waits for a proper payment.
  if p_amount <> v_payment.amount then
    update public.payments
    set status = 'paid', paid_at = now(), captured_amount = p_amount,
        failure_code = 'amount_mismatch'
    where id = v_payment.id;

    insert into public.refunds (payment_id, patient_id, amount, reason)
    values (v_payment.id, v_payment.patient_id, p_amount, 'amount_mismatch')
    on conflict (payment_id) do nothing;

    if v_booking.status = 'cancelled' and v_booking.payment_status in ('unpaid', 'refunded') then
      update public.lab_bookings set payment_status = 'refund_pending' where id = v_booking.id;
    end if;
    return 'refunding';
  end if;

  update public.payments
  set status = 'paid', paid_at = now(), failure_code = null
  where id = v_payment.id;

  if v_booking.status = 'awaiting_payment' then
    update public.lab_bookings
    set status = 'booked',
        payment_status = 'paid',
        confirmed_at = now(),
        status_changed_at = now()
    where id = v_booking.id;
    -- An earlier attempt that turned out paid: close the newer open one.
    update public.payments
    set status = 'expired'
    where lab_booking_id = v_booking.id and status = 'pending';
    return 'confirmed';
  end if;

  -- Cancelled meanwhile, or already paid by another attempt: it all goes back.
  insert into public.refunds (payment_id, patient_id, amount, reason)
  values (
    v_payment.id, v_payment.patient_id, v_payment.amount,
    case when v_booking.status = 'cancelled' then 'late_payment' else 'duplicate_payment' end
  )
  on conflict (payment_id) do nothing;

  -- A cancelled booking shows the money on its way back. An active one stays
  -- paid: only the extra payment is returned.
  if v_booking.status = 'cancelled' and v_booking.payment_status in ('unpaid', 'refunded') then
    update public.lab_bookings set payment_status = 'refund_pending' where id = v_booking.id;
  end if;

  return 'refunding';
end;
$$;

revoke execute on function public.record_payment_event(text, text, text, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.record_payment_event(text, text, text, text, integer, uuid) to service_role;

-- Sending refunds --------------------------------------------------------------------------
-- Claims one provider's refunds that are due, each by one worker, and books
-- the next try first, so a worker that dies mid-send only delays it: 5, 10,
-- 20, 40 minutes. One the provider accepted but never confirmed is sent again
-- daily under the same idempotency key, which only asks how it went. Five
-- tries with no answer and it's marked failed, for an admin (ADM-09).

drop function if exists public.claim_refunds(integer);

create or replace function public.claim_refunds(p_provider text, p_limit integer default 20)
returns table (refund_id uuid, payment_ref text, amount integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.refunds
  set status = 'failed', last_error = coalesce(last_error, 'no_answer')
  where status in ('pending', 'submitted') and attempts >= 5 and next_attempt_at <= now();

  return query
  with due as (
    select r.id
    from public.refunds r
    join public.payments p on p.id = r.payment_id
    where r.status in ('pending', 'submitted')
      and r.next_attempt_at <= now()
      and r.attempts < 5
      and p.provider = p_provider
    order by r.next_attempt_at
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update of r skip locked
  )
  update public.refunds r
  set attempts = r.attempts + 1,
      next_attempt_at = now() + case
        when r.status = 'submitted' then interval '1 day'
        else interval '5 minutes' * power(2, r.attempts)
      end
  from due, public.payments p
  where r.id = due.id and p.id = r.payment_id
  returning r.id, p.provider_ref, r.amount;
end;
$$;

revoke execute on function public.claim_refunds(text, integer) from public, anon, authenticated;
grant execute on function public.claim_refunds(text, integer) to service_role;

-- What the provider said to a refund request: 'succeeded', 'submitted' (its
-- webhook will say), or 'error' (tried again until the fifth try fails).
create or replace function public.record_refund_result(
  p_refund_id uuid,
  p_outcome text,
  p_provider_ref text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_booking_id uuid;
begin
  if p_outcome is null or p_outcome not in ('succeeded', 'submitted', 'error') then
    raise exception 'invalid_outcome';
  end if;

  select p.lab_booking_id into v_booking_id
  from public.refunds r
  join public.payments p on p.id = r.payment_id
  where r.id = p_refund_id;
  if not found then
    raise exception 'refund_not_found';
  end if;

  perform 1 from public.lab_bookings where id = v_booking_id for update;
  select * into v_refund from public.refunds where id = p_refund_id for update;

  if v_refund.status = 'succeeded'
    or (v_refund.status = 'failed' and p_outcome <> 'succeeded') then
    return;
  end if;

  if p_outcome = 'succeeded' then
    perform private.complete_refund(v_refund.id, p_provider_ref);
  elsif p_outcome = 'submitted' then
    update public.refunds
    set status = 'submitted',
        provider_ref = coalesce(p_provider_ref, provider_ref),
        next_attempt_at = now() + interval '1 day'
    where id = v_refund.id;
  else
    update public.refunds
    set last_error = left(coalesce(nullif(p_error, ''), 'error'), 64),
        status = case when attempts >= 5 then 'failed' else status end
    where id = v_refund.id;
  end if;
end;
$$;

revoke execute on function public.record_refund_result(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_refund_result(uuid, text, text, text) to service_role;

-- Reconciling -------------------------------------------------------------------------------
-- Attempts from the last two days, 10 minutes past their expiry and still not
-- paid, each handed out once to ask the provider about.

create or replace function public.claim_payments_to_reconcile(p_limit integer default 50)
returns table (payment_id uuid, provider text, provider_ref text, amount integer)
language sql
security definer
set search_path = ''
as $$
  with due as (
    select p.id
    from public.payments p
    where p.status in ('pending', 'expired')
      and p.reconciled_at is null
      and p.provider_ref is not null
      and p.expires_at < now() - interval '10 minutes'
      and p.created_at > now() - interval '2 days'
    order by p.expires_at
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    for update skip locked
  )
  update public.payments p
  set reconciled_at = now()
  from due
  where p.id = due.id
  returning p.id, p.provider, p.provider_ref, p.amount;
$$;

revoke execute on function public.claim_payments_to_reconcile(integer) from public, anon, authenticated;
grant execute on function public.claim_payments_to_reconcile(integer) to service_role;

-- Releasing holds ---------------------------------------------------------------------------
-- Two minutes after the due time, so a payment finished at the last second
-- whose webhook is on its way still confirms. Run every minute by pg_cron.

create or replace function private.expire_lab_payment_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.lab_bookings
  set status = 'cancelled',
      cancelled_by = 'system',
      status_reason = 'payment_not_completed',
      status_changed_at = now()
  where status = 'awaiting_payment'
    and payment_due_at < now() - interval '2 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function private.expire_lab_payment_holds() from public;

-- Notices and live updates ------------------------------------------------------------------

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
    'lab_booking_refunded', 'lab_booking_payment_expired'
  ));

-- A held booking tells nobody until it's paid.
create or replace function private.notify_lab_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'booked' then
    perform private.notify(new.patient_id, 'lab_booking_booked', '/patient/lab-tests');
    perform private.notify(new.lab_id, 'lab_booking_new', '/lab/bookings');
  end if;
  return null;
end;
$$;

-- Paid: the usual booked notices. Lapsed: the patient hears. Dropped by the
-- patient before paying: the lab never knew of it.
create or replace function private.notify_lab_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'awaiting_payment' then
    if new.status = 'booked' then
      perform private.notify(new.patient_id, 'lab_booking_booked', '/patient/lab-tests');
      perform private.notify(new.lab_id, 'lab_booking_new', '/lab/bookings');
    elsif new.cancelled_by = 'system' then
      perform private.notify(new.patient_id, 'lab_booking_payment_expired', '/patient/lab-tests');
    end if;
  elsif new.status = 'cancelled' and new.cancelled_by = 'patient' then
    perform private.notify(new.lab_id, 'lab_booking_cancelled', '/lab/bookings?stage=finished');
  else
    perform private.notify(new.patient_id, 'lab_booking_' || new.status, '/patient/lab-tests');
  end if;
  return null;
end;
$$;

-- Now also the move from awaiting payment to booked.
drop trigger if exists notify_lab_booking_status on public.lab_bookings;
create trigger notify_lab_booking_status
  after update of status on public.lab_bookings
  for each row
  when (old.status is distinct from new.status
    and (new.status <> 'booked' or old.status = 'awaiting_payment'))
  execute function private.notify_lab_booking_status();

-- The patient's open pages follow their booking: ids and statuses only.
create or replace function private.announce_lab_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.announce(
    array[new.patient_id],
    'lab_booking',
    jsonb_build_object(
      'id', new.id,
      'status', new.status,
      'payment_status', new.payment_status
    )
  );
  return null;
end;
$$;

revoke execute on function private.announce_lab_booking() from public;

drop trigger if exists announce_lab_booking on public.lab_bookings;
create trigger announce_lab_booking
  after update of status, payment_status on public.lab_bookings
  for each row
  when (old.status is distinct from new.status
    or old.payment_status is distinct from new.payment_status)
  execute function private.announce_lab_booking();

-- Schedules -----------------------------------------------------------------------------------

-- Sends refunds and reconciles, through the app, with the reminders' secrets.
create or replace function private.request_payments_run()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site_url text;
  v_secret text;
begin
  select decrypted_secret into v_site_url
  from vault.decrypted_secrets where name = 'reminders_site_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'reminders_cron_secret';

  if v_site_url is null or v_secret is null then
    return;
  end if;

  perform net.http_get(
    url := rtrim(v_site_url, '/') || '/api/cron/payments',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function private.request_payments_run() from public;

-- Scheduling the same name again replaces the job.
select cron.schedule(
  'lab-payment-holds',
  '* * * * *',
  'select private.expire_lab_payment_holds()'
);

select cron.schedule(
  'payments',
  '*/5 * * * *',
  'select private.request_payments_run()'
);
