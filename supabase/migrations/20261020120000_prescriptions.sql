-- MedEase: prescriptions. Safe to run more than once.
--
-- A doctor writes a prescription for one of their appointments once it has
-- started, for up to 14 days after the start (keep in sync with
-- PRESCRIBE_WINDOW_DAYS in the app). Issued prescriptions are never edited in
-- place: an edit issues a new version that replaces the old one, and a
-- mistake is cancelled with a reason, so the patient always sees what
-- changed. Patients and doctors only read; every write goes through the
-- SECURITY DEFINER functions below, which check who is calling.

-- Prescriptions ------------------------------------------------------------------

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'replaced', 'cancelled')),
  diagnosis text check (char_length(diagnosis) <= 200),
  advice text check (char_length(advice) <= 1000),
  -- Snapshots taken when issued, so the prescription reads the same later.
  doctor_name text not null,
  doctor_specialization text not null,
  doctor_license text not null,
  clinic_address text not null,
  patient_name text not null,
  timezone text not null,
  replaces_id uuid references public.prescriptions (id) on delete set null,
  issued_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancellation_reason text check (char_length(cancellation_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active prescription per appointment; edits replace it.
create unique index if not exists prescriptions_one_active_per_appointment
  on public.prescriptions (appointment_id) where status = 'active';
create index if not exists prescriptions_appointment_idx
  on public.prescriptions (appointment_id);
create index if not exists prescriptions_patient_issued_idx
  on public.prescriptions (patient_id, issued_at desc);
create index if not exists prescriptions_doctor_issued_idx
  on public.prescriptions (doctor_id, issued_at desc);
create index if not exists prescriptions_replaces_idx
  on public.prescriptions (replaces_id);

drop trigger if exists set_updated_at on public.prescriptions;
create trigger set_updated_at before update on public.prescriptions
  for each row execute function public.set_updated_at();

alter table public.prescriptions enable row level security;
revoke all on public.prescriptions from anon, authenticated;
grant select on public.prescriptions to authenticated;
grant all on public.prescriptions to service_role;

drop policy if exists "Patients and doctors read their prescriptions" on public.prescriptions;
create policy "Patients and doctors read their prescriptions" on public.prescriptions
  for select to authenticated
  using ((select auth.uid()) in (patient_id, doctor_id));

-- Medicines on a prescription ------------------------------------------------------

create table if not exists public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  sort_order smallint not null check (sort_order between 1 and 20),
  medicine text not null check (char_length(medicine) between 1 and 100),
  strength text check (char_length(strength) between 1 and 40),
  form text not null check (form in (
    'tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler',
    'sachet', 'other'
  )),
  dose text not null check (char_length(dose) between 1 and 40),
  frequency text not null check (frequency in ('daily', 'weekly', 'as_needed')),
  dose_times text[] not null default '{}'
    check (dose_times <@ array['morning', 'afternoon', 'night']::text[]),
  meal text not null default 'any'
    check (meal in ('any', 'before_food', 'after_food', 'with_food')),
  duration_days smallint check (duration_days between 1 and 365),
  instructions text check (char_length(instructions) between 1 and 300),
  unique (prescription_id, sort_order),
  -- Scheduled medicines need a time of day; "as needed" ones have none.
  check ((frequency = 'as_needed') = (cardinality(dose_times) = 0))
);

alter table public.prescription_items enable row level security;
revoke all on public.prescription_items from anon, authenticated;
grant select on public.prescription_items to authenticated;
grant all on public.prescription_items to service_role;

drop policy if exists "Patients and doctors read their prescription items" on public.prescription_items;
create policy "Patients and doctors read their prescription items" on public.prescription_items
  for select to authenticated
  using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id
        and (select auth.uid()) in (p.patient_id, p.doctor_id)
    )
  );

-- Issuing (new or replacing the active version) ---------------------------------------
-- p_items: [{ "medicine": "Amoxicillin", "strength": "500 mg", "form": "capsule",
--   "dose": "1 capsule", "frequency": "daily", "dose_times": ["morning", "night"],
--   "meal": "after_food", "duration_days": 5, "instructions": null }, ...]
-- p_replaces_id is the active version the doctor was editing (null for a new
-- one). If it no longer matches, someone changed it meanwhile and we refuse.

create or replace function public.issue_prescription(
  p_appointment_id uuid,
  p_items jsonb,
  p_diagnosis text default null,
  p_advice text default null,
  p_replaces_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_appointment public.appointments;
  v_doctor public.doctor_profiles;
  v_current_id uuid;
  v_row public.prescriptions;
  v_constraint text;
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
    raise exception 'prescribe_not_started';
  end if;
  if now() > v_appointment.starts_at + interval '14 days' then
    raise exception 'prescribe_window_closed';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'invalid_prescription';
  end if;

  select id into v_current_id from public.prescriptions
  where appointment_id = v_appointment.id and status = 'active';

  if v_current_id is distinct from p_replaces_id then
    raise exception 'prescription_changed';
  end if;

  select * into v_doctor from public.doctor_profiles where id = v_uid;

  begin
    if v_current_id is not null then
      update public.prescriptions set status = 'replaced' where id = v_current_id;
    end if;

    insert into public.prescriptions (
      appointment_id, doctor_id, patient_id, diagnosis, advice,
      doctor_name, doctor_specialization, doctor_license, clinic_address,
      patient_name, timezone, replaces_id
    ) values (
      v_appointment.id, v_uid, v_appointment.patient_id,
      nullif(trim(coalesce(p_diagnosis, '')), ''),
      nullif(trim(coalesce(p_advice, '')), ''),
      'Dr. ' || v_doctor.first_name || ' ' || v_doctor.last_name,
      v_doctor.specialization, v_doctor.license_number, v_doctor.clinic_address,
      v_appointment.patient_name, v_appointment.timezone, v_current_id
    )
    returning * into v_row;

    insert into public.prescription_items (
      prescription_id, sort_order, medicine, strength, form, dose, frequency,
      dose_times, meal, duration_days, instructions
    )
    select
      v_row.id,
      item.ord::smallint,
      trim(item.value ->> 'medicine'),
      nullif(trim(coalesce(item.value ->> 'strength', '')), ''),
      item.value ->> 'form',
      trim(item.value ->> 'dose'),
      item.value ->> 'frequency',
      -- Keep only known times, once each, in day order.
      case when item.value ->> 'frequency' = 'as_needed' then '{}'::text[]
      else array(
        select t.name
        from unnest(array['morning', 'afternoon', 'night']) with ordinality as t(name, n)
        where jsonb_typeof(item.value -> 'dose_times') = 'array'
          and (item.value -> 'dose_times') ? t.name
        order by t.n
      ) end,
      coalesce(item.value ->> 'meal', 'any'),
      (item.value ->> 'duration_days')::smallint,
      nullif(trim(coalesce(item.value ->> 'instructions', '')), '')
    from jsonb_array_elements(p_items) with ordinality as item(value, ord);
  exception
    when check_violation or not_null_violation or invalid_text_representation
      or numeric_value_out_of_range then
      raise exception 'invalid_prescription';
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'prescriptions_one_active_per_appointment' then
        raise exception 'prescription_changed';
      end if;
      raise;
  end;

  return to_jsonb(v_row) || jsonb_build_object(
    'patient_email', v_appointment.patient_email,
    'replaced', v_current_id is not null
  );
end;
$$;

revoke execute on function public.issue_prescription(uuid, jsonb, text, text, uuid) from public, anon;
grant execute on function public.issue_prescription(uuid, jsonb, text, text, uuid) to authenticated;

-- Cancelling (doctor, any time, with a reason for the patient) ------------------------

create or replace function public.cancel_prescription(
  p_prescription_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.prescriptions;
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_patient_email text;
begin
  select * into v_row from public.prescriptions
  where id = p_prescription_id and doctor_id = auth.uid()
  for update;

  if not found then
    raise exception 'prescription_not_found';
  end if;
  if v_row.status <> 'active' then
    raise exception 'prescription_not_active';
  end if;
  if v_reason is null then
    raise exception 'reason_required';
  end if;

  update public.prescriptions
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = v_reason
  where id = v_row.id
  returning * into v_row;

  select a.patient_email into v_patient_email
  from public.appointments a where a.id = v_row.appointment_id;

  return to_jsonb(v_row) || jsonb_build_object('patient_email', v_patient_email);
end;
$$;

revoke execute on function public.cancel_prescription(uuid, text) from public, anon;
grant execute on function public.cancel_prescription(uuid, text) to authenticated;

-- Outcome: replaces the version in the appointments migration ----------------------------
-- A patient who was prescribed for attended, so no-show is refused while an
-- active prescription exists.

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
  if p_status = 'no_show' and exists (
    select 1 from public.prescriptions
    where appointment_id = v_row.id and status = 'active'
  ) then
    raise exception 'has_prescription';
  end if;

  update public.appointments set status = p_status where id = v_row.id;
end;
$$;

revoke execute on function public.set_appointment_outcome(uuid, text) from public, anon;
grant execute on function public.set_appointment_outcome(uuid, text) to authenticated;
