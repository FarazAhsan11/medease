-- MedEase: doctor schedules and appointment booking. Safe to run more than once.
--
-- Doctors publish weekly hours; patients book slots generated from them.
-- Every write goes through a SECURITY DEFINER function that checks who is
-- calling, and a unique index makes double-booking impossible even when two
-- patients pick the same slot at the same moment.

-- Public details on the doctor profile -----------------------------------------

alter table public.doctor_profiles
  add column if not exists bio text check (char_length(bio) <= 1000),
  add column if not exists city text check (char_length(city) <= 80),
  add column if not exists experience_years smallint not null default 0
    check (experience_years between 0 and 70),
  add column if not exists consultation_fee integer not null default 2000
    check (consultation_fee between 0 and 1000000),
  add column if not exists slot_minutes smallint not null default 30
    check (slot_minutes in (10, 15, 20, 30, 45, 60)),
  add column if not exists accepting_appointments boolean not null default true,
  add column if not exists timezone text not null default 'Asia/Karachi';

-- Doctors edit their own profile directly, but not verified or system fields
-- (license, documents, timezone). Schedule settings go through
-- save_doctor_schedule below.
revoke update on public.doctor_profiles from authenticated;
grant update (
  first_name, last_name, phone, age, gender, specialization,
  clinic_address, bio, city, experience_years
) on public.doctor_profiles to authenticated;

-- Weekly hours -------------------------------------------------------------------

create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists doctor_availability_doctor_weekday_idx
  on public.doctor_availability (doctor_id, weekday);

alter table public.doctor_availability enable row level security;
revoke all on public.doctor_availability from anon, authenticated;
grant select on public.doctor_availability to anon, authenticated;
grant all on public.doctor_availability to service_role;

-- Opening hours are public, like the sign on a clinic door.
drop policy if exists "Anyone can read weekly hours" on public.doctor_availability;
create policy "Anyone can read weekly hours" on public.doctor_availability
  for select to anon, authenticated
  using (true);

-- Public doctor directory ----------------------------------------------------------
-- Runs with the view owner's rights so guests can browse doctors without
-- seeing private columns (phone, license, documents) of doctor_profiles.

create or replace view public.doctor_directory
with (security_invoker = false) as
select
  d.id,
  d.first_name,
  d.last_name,
  'Dr. ' || d.first_name || ' ' || d.last_name as full_name,
  d.gender,
  d.specialization,
  d.city,
  d.clinic_address,
  d.bio,
  d.experience_years,
  d.consultation_fee,
  d.slot_minutes,
  d.timezone,
  d.accepting_appointments,
  exists (
    select 1 from public.doctor_availability a where a.doctor_id = d.id
  ) as has_schedule,
  d.created_at
from public.doctor_profiles d;

grant select on public.doctor_directory to anon, authenticated;

-- Appointments ---------------------------------------------------------------------

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked', 'completed', 'cancelled', 'no_show')),
  reason text check (char_length(reason) <= 500),
  -- Snapshots taken at booking, so history stays right if profiles change.
  doctor_name text not null,
  doctor_specialization text not null,
  consultation_fee integer not null,
  timezone text not null,
  patient_name text not null,
  patient_email text not null,
  patient_phone text,
  cancelled_by text check (cancelled_by in ('patient', 'doctor')),
  cancellation_reason text check (char_length(cancellation_reason) <= 500),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- One active booking per doctor slot, and a patient can't be in two places.
create unique index if not exists appointments_doctor_slot_key
  on public.appointments (doctor_id, starts_at) where status <> 'cancelled';
create unique index if not exists appointments_patient_slot_key
  on public.appointments (patient_id, starts_at) where status <> 'cancelled';
create index if not exists appointments_patient_starts_idx
  on public.appointments (patient_id, starts_at desc);
create index if not exists appointments_doctor_starts_idx
  on public.appointments (doctor_id, starts_at);

drop trigger if exists set_updated_at on public.appointments;
create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;
revoke all on public.appointments from anon, authenticated;
grant select on public.appointments to authenticated;
grant all on public.appointments to service_role;

drop policy if exists "Patients and doctors read their appointments" on public.appointments;
create policy "Patients and doctors read their appointments" on public.appointments
  for select to authenticated
  using ((select auth.uid()) in (patient_id, doctor_id));

-- Private consultation notes (doctor only) -------------------------------------------

create table if not exists public.appointment_notes (
  appointment_id uuid primary key references public.appointments (id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 5000),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.appointment_notes;
create trigger set_updated_at before update on public.appointment_notes
  for each row execute function public.set_updated_at();

alter table public.appointment_notes enable row level security;
revoke all on public.appointment_notes from anon, authenticated;
grant select, insert, update on public.appointment_notes to authenticated;
grant all on public.appointment_notes to service_role;

drop policy if exists "Doctors manage notes on their appointments" on public.appointment_notes;
create policy "Doctors manage notes on their appointments" on public.appointment_notes
  for all to authenticated
  using ((select auth.uid()) = doctor_id)
  with check (
    (select auth.uid()) = doctor_id
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.doctor_id = (select auth.uid())
    )
  );

-- Bookable slots -------------------------------------------------------------------
-- Generated from weekly hours in the doctor's timezone, starting today, at
-- least 30 minutes ahead. `is_booked` says a slot is taken, never by whom.

create or replace function public.get_doctor_slots(
  p_doctor_id uuid,
  p_days integer default 14
)
returns table (starts_at timestamptz, ends_at timestamptz, is_booked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with doctor as (
    select d.id, d.timezone, make_interval(mins => d.slot_minutes) as step
    from public.doctor_profiles d
    where d.id = p_doctor_id and d.accepting_appointments
  ),
  days as (
    select doctor.*, (now() at time zone doctor.timezone)::date + n as day
    from doctor, generate_series(0, least(greatest(p_days, 1), 30) - 1) as n
  ),
  slots as (
    select distinct (s.local_start at time zone days.timezone) as starts_at, days.step
    from days
    join public.doctor_availability a
      on a.doctor_id = days.id and a.weekday = extract(dow from days.day)
    cross join lateral generate_series(
      days.day + a.start_time,
      days.day + a.end_time - days.step,
      days.step
    ) as s(local_start)
  )
  select
    s.starts_at,
    s.starts_at + s.step,
    exists (
      select 1 from public.appointments ap
      where ap.doctor_id = p_doctor_id
        and ap.starts_at = s.starts_at
        and ap.status <> 'cancelled'
    )
  from slots s
  where s.starts_at > now() + interval '30 minutes'
  order by s.starts_at;
$$;

revoke execute on function public.get_doctor_slots(uuid, integer) from public;
grant execute on function public.get_doctor_slots(uuid, integer) to anon, authenticated;

-- Booking --------------------------------------------------------------------------
-- Errors are raised as short codes the app turns into friendly messages.

create or replace function public.book_appointment(
  p_doctor_id uuid,
  p_starts_at timestamptz,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := auth.uid();
  v_doctor public.doctor_profiles;
  v_slot record;
  v_patient_name text;
  v_patient_phone text;
  v_patient_email text;
  v_doctor_email text;
  v_constraint text;
  v_row public.appointments;
begin
  if v_patient_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  select * into v_doctor from public.doctor_profiles where id = p_doctor_id;
  if not found then
    raise exception 'doctor_not_found';
  end if;
  if not v_doctor.accepting_appointments then
    raise exception 'not_accepting';
  end if;

  select * into v_slot
  from public.get_doctor_slots(p_doctor_id, 30) s
  where s.starts_at = p_starts_at;
  if not found then
    raise exception 'slot_unavailable';
  end if;
  if v_slot.is_booked then
    raise exception 'slot_taken';
  end if;

  if exists (
    select 1 from public.appointments
    where patient_id = v_patient_id and doctor_id = p_doctor_id
      and status = 'booked' and starts_at > now()
  ) then
    raise exception 'already_booked_with_doctor';
  end if;

  if exists (
    select 1 from public.appointments
    where patient_id = v_patient_id and status = 'booked'
      and starts_at < v_slot.ends_at and ends_at > p_starts_at
  ) then
    raise exception 'patient_time_conflict';
  end if;

  select trim(p.first_name || ' ' || p.last_name), p.phone
    into v_patient_name, v_patient_phone
  from public.patient_profiles p where p.id = v_patient_id;

  select u.email, coalesce(v_patient_name, u.raw_user_meta_data ->> 'full_name', u.email)
    into v_patient_email, v_patient_name
  from auth.users u where u.id = v_patient_id;

  select u.email into v_doctor_email from auth.users u where u.id = p_doctor_id;

  begin
    insert into public.appointments (
      doctor_id, patient_id, starts_at, ends_at, reason,
      doctor_name, doctor_specialization, consultation_fee, timezone,
      patient_name, patient_email, patient_phone
    ) values (
      p_doctor_id, v_patient_id, p_starts_at, v_slot.ends_at,
      nullif(left(trim(coalesce(p_reason, '')), 500), ''),
      'Dr. ' || v_doctor.first_name || ' ' || v_doctor.last_name,
      v_doctor.specialization, v_doctor.consultation_fee, v_doctor.timezone,
      v_patient_name, v_patient_email, v_patient_phone
    )
    returning * into v_row;
  exception when unique_violation then
    -- Someone else got there first between the checks above and the insert.
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'appointments_patient_slot_key' then
      raise exception 'patient_time_conflict';
    end if;
    raise exception 'slot_taken';
  end;

  return to_jsonb(v_row) || jsonb_build_object('doctor_email', v_doctor_email);
end;
$$;

revoke execute on function public.book_appointment(uuid, timestamptz, text) from public, anon;
grant execute on function public.book_appointment(uuid, timestamptz, text) to authenticated;

-- Cancelling (patient or doctor, before it starts) ---------------------------------

create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.appointments;
  v_doctor_email text;
begin
  select * into v_row from public.appointments
  where id = p_appointment_id
  for update;

  if not found or v_uid is null or v_uid not in (v_row.patient_id, v_row.doctor_id) then
    raise exception 'appointment_not_found';
  end if;
  if v_row.status <> 'booked' then
    raise exception 'not_cancellable';
  end if;
  if v_row.starts_at <= now() then
    raise exception 'already_started';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_by = case when v_uid = v_row.doctor_id then 'doctor' else 'patient' end,
      cancellation_reason = nullif(left(trim(coalesce(p_reason, '')), 500), ''),
      cancelled_at = now()
  where id = v_row.id
  returning * into v_row;

  select u.email into v_doctor_email from auth.users u where u.id = v_row.doctor_id;

  return to_jsonb(v_row) || jsonb_build_object('doctor_email', v_doctor_email);
end;
$$;

revoke execute on function public.cancel_appointment(uuid, text) from public, anon;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;

-- Outcome (doctor, once the appointment has started) ---------------------------------

create or replace function public.set_appointment_outcome(
  p_appointment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.appointments;
begin
  if p_status not in ('completed', 'no_show') then
    raise exception 'invalid_status';
  end if;

  select * into v_row from public.appointments
  where id = p_appointment_id and doctor_id = auth.uid()
  for update;

  if not found then
    raise exception 'appointment_not_found';
  end if;
  if v_row.status <> 'booked' then
    raise exception 'not_open';
  end if;
  if v_row.starts_at > now() then
    raise exception 'not_started';
  end if;

  update public.appointments set status = p_status where id = v_row.id;
end;
$$;

revoke execute on function public.set_appointment_outcome(uuid, text) from public, anon;
grant execute on function public.set_appointment_outcome(uuid, text) to authenticated;

-- Saving a doctor's schedule (all-or-nothing) ------------------------------------------
-- p_ranges: [{ "weekday": 1, "start": "09:00", "end": "13:00" }, ...]
-- Existing bookings are kept even if they fall outside the new hours.

create or replace function public.save_doctor_schedule(
  p_ranges jsonb,
  p_slot_minutes integer,
  p_accepting boolean,
  p_fee integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor'
    or not exists (select 1 from public.doctor_profiles where id = v_uid) then
    raise exception 'not_doctor';
  end if;

  if jsonb_typeof(p_ranges) <> 'array' or jsonb_array_length(p_ranges) > 28 then
    raise exception 'invalid_schedule';
  end if;

  delete from public.doctor_availability where doctor_id = v_uid;

  insert into public.doctor_availability (doctor_id, weekday, start_time, end_time)
  select v_uid, (r ->> 'weekday')::smallint, (r ->> 'start')::time, (r ->> 'end')::time
  from jsonb_array_elements(p_ranges) as r;

  if exists (
    select 1
    from public.doctor_availability a
    join public.doctor_availability b
      on a.doctor_id = b.doctor_id and a.weekday = b.weekday and a.id <> b.id
     and a.start_time < b.end_time and b.start_time < a.end_time
    where a.doctor_id = v_uid
  ) then
    raise exception 'overlapping_hours';
  end if;

  update public.doctor_profiles
  set slot_minutes = p_slot_minutes,
      accepting_appointments = p_accepting,
      consultation_fee = p_fee
  where id = v_uid;
end;
$$;

revoke execute on function public.save_doctor_schedule(jsonb, integer, boolean, integer) from public, anon;
grant execute on function public.save_doctor_schedule(jsonb, integer, boolean, integer) to authenticated;
