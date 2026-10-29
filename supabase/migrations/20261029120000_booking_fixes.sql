-- MedEase: booking and call window fixes (FIX-08, FIX-09, FIX-12). Safe to run
-- more than once. Run after the appointments and video calls migrations.
--
-- FIX-08: a booking blocks every slot it overlaps, not only the one starting
-- at the same time, so changing the slot length can't double-book. Exclusion
-- constraints enforce it for the doctor and for the patient, even when two
-- requests race.
-- FIX-09: calls stay open until 15 minutes after the slot ends, and at least
-- 30 minutes after the start.
-- FIX-12: doctors who never confirmed their email are not listed and can't be
-- booked. doctor_directory decides who is listed; get_doctor_slots and
-- book_appointment go through it, so ADM-03 adds approval in one place.

-- Overlapping bookings made before this fix would block the constraints
-- below. Stop with a clear message instead of changing anyone's appointment.
do $$
declare
  v_pairs integer;
begin
  select count(*) into v_pairs
  from public.appointments a
  join public.appointments b
    on a.id < b.id
   and (a.doctor_id = b.doctor_id or a.patient_id = b.patient_id)
   and a.starts_at < b.ends_at and b.starts_at < a.ends_at
  where a.status <> 'cancelled' and b.status <> 'cancelled';

  if v_pairs > 0 then
    raise exception '% pair(s) of overlapping appointments exist. Cancel one of each pair, then run this migration again.', v_pairs
      using hint = 'List them: select a.id, b.id from public.appointments a join public.appointments b on a.id < b.id and (a.doctor_id = b.doctor_id or a.patient_id = b.patient_id) and a.starts_at < b.ends_at and b.starts_at < a.ends_at where a.status <> ''cancelled'' and b.status <> ''cancelled'';';
  end if;
end;
$$;

-- No overlapping bookings (FIX-08) -----------------------------------------------
-- btree_gist lets one constraint compare the doctor (or patient) with = and
-- the time range with &&. Ranges are [start, end), so back-to-back slots fit.

create extension if not exists btree_gist with schema extensions;

drop index if exists public.appointments_doctor_slot_key;
drop index if exists public.appointments_patient_slot_key;

alter table public.appointments
  drop constraint if exists appointments_doctor_no_overlap,
  drop constraint if exists appointments_patient_no_overlap;

alter table public.appointments
  add constraint appointments_doctor_no_overlap
    exclude using gist (doctor_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status <> 'cancelled'),
  add constraint appointments_patient_no_overlap
    exclude using gist (patient_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status <> 'cancelled');

-- Public doctor directory (FIX-12) -------------------------------------------------
-- Same columns as before; only doctors who confirmed their email are listed.
-- The check reads auth.users through a helper in the private schema, which
-- the Data API doesn't serve, so the view never references auth.users itself.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.has_confirmed_email(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.email_confirmed_at is not null
  );
$$;

-- Views run their functions with the caller's rights, so guests need this.
revoke execute on function private.has_confirmed_email(uuid) from public;
grant execute on function private.has_confirmed_email(uuid) to anon, authenticated;

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
from public.doctor_profiles d
where private.has_confirmed_email(d.id);

grant select on public.doctor_directory to anon, authenticated;

-- Bookable slots ------------------------------------------------------------------
-- Only for listed doctors; a slot is booked when any active appointment
-- overlaps it.

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
    from public.doctor_directory d
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
        and ap.status <> 'cancelled'
        and ap.starts_at < s.starts_at + s.step
        and ap.ends_at > s.starts_at
    )
  from slots s
  where s.starts_at > now() + interval '30 minutes'
  order by s.starts_at;
$$;

revoke execute on function public.get_doctor_slots(uuid, integer) from public;
grant execute on function public.get_doctor_slots(uuid, integer) to anon, authenticated;

-- Booking ----------------------------------------------------------------------------

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

  -- Doctors who aren't listed can't be booked.
  if not exists (select 1 from public.doctor_directory where id = p_doctor_id) then
    raise exception 'doctor_not_found';
  end if;

  select * into v_doctor from public.doctor_profiles where id = p_doctor_id;
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
    where patient_id = v_patient_id and status <> 'cancelled'
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
  exception when exclusion_violation then
    -- Someone else got there first between the checks above and the insert.
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'appointments_patient_no_overlap' then
      raise exception 'patient_time_conflict';
    end if;
    raise exception 'slot_taken';
  end;

  return to_jsonb(v_row) || jsonb_build_object('doctor_email', v_doctor_email);
end;
$$;

revoke execute on function public.book_appointment(uuid, timestamptz, text) from public, anon;
grant execute on function public.book_appointment(uuid, timestamptz, text) to authenticated;

-- Call window (FIX-09) ------------------------------------------------------------------
-- Opens 5 minutes before the start; closes 15 minutes after the slot ends, and
-- never sooner than 30 minutes after the start. Keep in sync with CALL_WINDOW
-- in the app.

create or replace function public.call_closes_at(
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select greatest(p_ends_at + interval '15 minutes', p_starts_at + interval '30 minutes');
$$;

revoke execute on function public.call_closes_at(timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.can_join_call(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
begin
  if p_topic is null
    or p_topic !~ '^call:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  v_appointment_id := substring(p_topic from 6)::uuid;

  return exists (
    select 1
    from public.appointments a
    where a.id = v_appointment_id
      and (select auth.uid()) in (a.patient_id, a.doctor_id)
      and a.status = 'booked'
      and now() >= a.starts_at - interval '5 minutes'
      and now() < public.call_closes_at(a.starts_at, a.ends_at)
  );
end;
$$;

revoke execute on function public.can_join_call(text) from public, anon;
grant execute on function public.can_join_call(text) to authenticated;

create or replace function public.record_call_event(
  p_appointment_id uuid,
  p_event text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event not in ('started', 'ended') then
    raise exception 'invalid_event';
  end if;

  if p_event = 'started' and not public.can_join_call('call:' || p_appointment_id::text) then
    raise exception 'call_not_open';
  end if;

  -- Ending is allowed up to 10 minutes past the window, since the automatic
  -- hang-up happens right at the limit.
  if p_event = 'ended' and not exists (
    select 1 from public.appointments a
    where a.id = p_appointment_id
      and (select auth.uid()) in (a.patient_id, a.doctor_id)
      and now() < public.call_closes_at(a.starts_at, a.ends_at) + interval '10 minutes'
  ) then
    raise exception 'call_not_open';
  end if;

  if p_event = 'started' then
    update public.appointments
    set call_started_at = coalesce(call_started_at, now())
    where id = p_appointment_id;
  else
    update public.appointments
    set call_ended_at = now()
    where id = p_appointment_id and call_started_at is not null;
  end if;
end;
$$;

revoke execute on function public.record_call_event(uuid, text) from public, anon;
grant execute on function public.record_call_event(uuid, text) to authenticated;
