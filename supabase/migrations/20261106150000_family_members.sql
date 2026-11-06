-- MedEase: family members (PRO-03 screens, APT-09, FIX-15). Safe to run more
-- than once. Run after the doctor medical profiles migration.
--
-- A patient adds the people they look after and books for them. The account
-- holder stays the contact: emails, reminders and the call all go to them, so
-- patient_name keeps meaning the account holder. The person treated gets their
-- own snapshot on each record, like the doctor's name, so a prescription names
-- the child it's for even if the family member is later renamed.

-- Who a visit is for, by name ---------------------------------------------------

alter table public.appointments
  add column if not exists care_recipient_name text,
  add column if not exists care_recipient_relation text;
alter table public.prescriptions
  add column if not exists care_recipient_name text,
  add column if not exists care_recipient_relation text;

-- A backfill isn't an edit, so updated_at keeps its real value. Every record so
-- far is for the account holder, whose name at the time is patient_name.
alter table public.appointments disable trigger set_updated_at;
alter table public.prescriptions disable trigger set_updated_at;

update public.appointments a
set care_recipient_name = case
      when c.relation = 'self' then a.patient_name
      else trim(c.first_name || ' ' || c.last_name)
    end,
    care_recipient_relation = c.relation
from public.care_recipients c
where c.id = a.care_recipient_id
  and (a.care_recipient_name is null or a.care_recipient_relation is null);

update public.prescriptions p
set care_recipient_name = a.care_recipient_name,
    care_recipient_relation = a.care_recipient_relation
from public.appointments a
where a.id = p.appointment_id
  and (p.care_recipient_name is null or p.care_recipient_relation is null);

alter table public.appointments enable trigger set_updated_at;
alter table public.prescriptions enable trigger set_updated_at;

alter table public.appointments
  alter column care_recipient_name set not null,
  alter column care_recipient_relation set not null;
alter table public.prescriptions
  alter column care_recipient_name set not null,
  alter column care_recipient_relation set not null;

alter table public.appointments
  drop constraint if exists appointments_care_recipient_relation_check;
alter table public.appointments
  add constraint appointments_care_recipient_relation_check
    check (care_recipient_relation in ('self', 'child', 'parent', 'spouse', 'sibling', 'other'));

alter table public.prescriptions
  drop constraint if exists prescriptions_care_recipient_relation_check;
alter table public.prescriptions
  add constraint prescriptions_care_recipient_relation_check
    check (care_recipient_relation in ('self', 'child', 'parent', 'spouse', 'sibling', 'other'));

-- New records fill the snapshot from the person they name.

create or replace function private.set_appointment_care_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_relation text;
  v_name text;
begin
  if new.care_recipient_id is null then
    new.care_recipient_id := private.self_care_recipient(new.patient_id);
  end if;

  if new.care_recipient_name is null or new.care_recipient_relation is null then
    select relation, trim(first_name || ' ' || last_name)
      into v_relation, v_name
    from public.care_recipients
    where id = new.care_recipient_id;

    new.care_recipient_relation := coalesce(new.care_recipient_relation, v_relation);
    -- The account holder's name is already on the booking.
    new.care_recipient_name := coalesce(
      new.care_recipient_name,
      case when v_relation = 'self' then new.patient_name else v_name end
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.set_appointment_care_recipient() from public;

create or replace function private.set_prescription_care_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.care_recipient_id is null
    or new.care_recipient_name is null
    or new.care_recipient_relation is null then
    select coalesce(new.care_recipient_id, a.care_recipient_id),
           coalesce(new.care_recipient_name, a.care_recipient_name),
           coalesce(new.care_recipient_relation, a.care_recipient_relation)
      into new.care_recipient_id, new.care_recipient_name, new.care_recipient_relation
    from public.appointments a
    where a.id = new.appointment_id;
  end if;
  return new;
end;
$$;

revoke execute on function private.set_prescription_care_recipient() from public;

-- Adding and editing family members ------------------------------------------------
-- The account holder's own row is saved through save_patient_profile; this is for
-- everyone else. Ten is plenty for a household and stops a runaway script.

create or replace function public.save_family_member(
  p_id uuid,
  p_first_name text,
  p_last_name text,
  p_relation text,
  p_date_of_birth date,
  p_gender text default null,
  p_blood_group text default null,
  p_height_cm integer default null,
  p_weight_kg numeric default null,
  p_allergies text[] default '{}',
  p_chronic_conditions text[] default '{}',
  p_current_medicines text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_allergies text[] := private.clean_list(p_allergies);
  v_conditions text[] := private.clean_list(p_chronic_conditions);
  v_medicines text[] := private.clean_list(p_current_medicines);
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient'
    or not exists (select 1 from public.patient_profiles where id = v_uid) then
    raise exception 'not_patient';
  end if;

  if p_relation is null or p_relation not in ('child', 'parent', 'spouse', 'sibling', 'other') then
    raise exception 'invalid_relation';
  end if;

  if p_date_of_birth is null
    or p_date_of_birth > current_date
    or p_date_of_birth < current_date - interval '130 years' then
    raise exception 'invalid_date_of_birth';
  end if;

  if exists (
    select 1 from unnest(v_allergies || v_conditions || v_medicines) as item
    where char_length(item) > 100
  ) then
    raise exception 'invalid_profile';
  end if;

  -- One save at a time per account, so two tabs can't pass the limit together.
  perform 1 from public.patient_profiles where id = v_uid for update;

  begin
    if p_id is null then
      if (
        select count(*) from public.care_recipients
        where account_id = v_uid and relation <> 'self'
      ) >= 10 then
        raise exception 'too_many_family_members';
      end if;

      insert into public.care_recipients (
        account_id, relation, first_name, last_name, date_of_birth, gender,
        blood_group, height_cm, weight_kg, allergies, chronic_conditions,
        current_medicines
      ) values (
        v_uid, p_relation, trim(p_first_name), trim(p_last_name), p_date_of_birth,
        p_gender, p_blood_group, p_height_cm, p_weight_kg, v_allergies,
        v_conditions, v_medicines
      )
      returning id into v_id;
    else
      update public.care_recipients
      set relation = p_relation,
          first_name = trim(p_first_name),
          last_name = trim(p_last_name),
          date_of_birth = p_date_of_birth,
          gender = p_gender,
          blood_group = p_blood_group,
          height_cm = p_height_cm,
          weight_kg = p_weight_kg,
          allergies = v_allergies,
          chronic_conditions = v_conditions,
          current_medicines = v_medicines
      where id = p_id and account_id = v_uid and relation <> 'self'
      returning id into v_id;

      if v_id is null then
        raise exception 'family_member_not_found';
      end if;
    end if;
  exception
    when check_violation or not_null_violation or numeric_value_out_of_range then
      raise exception 'invalid_profile';
  end;

  return v_id;
end;
$$;

revoke execute on function public.save_family_member(
  uuid, text, text, text, date, text, text, integer, numeric, text[], text[], text[]
) from public, anon;
grant execute on function public.save_family_member(
  uuid, text, text, text, date, text, text, integer, numeric, text[], text[], text[]
) to authenticated;

-- Removing one: only someone with no records, since records must keep naming the
-- person they're about. The foreign keys enforce this too; checking first gives
-- the patient a reason instead of a failed commit.

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
    or exists (select 1 from public.patient_documents where care_recipient_id = p_id) then
    raise exception 'family_member_has_records';
  end if;

  delete from public.care_recipients where id = p_id and account_id = v_uid;
end;
$$;

revoke execute on function public.delete_family_member(uuid) from public, anon;
grant execute on function public.delete_family_member(uuid) to authenticated;

-- Booking for someone (APT-09, FIX-15) ------------------------------------------------
-- Same as before, plus the person the visit is for. The one-upcoming-visit rule
-- now applies per person, so a parent and child can each see the same doctor.
-- Overlaps stay per account: the account holder joins every call.

drop function if exists public.book_appointment(uuid, timestamptz, text);

create or replace function public.book_appointment(
  p_doctor_id uuid,
  p_starts_at timestamptz,
  p_reason text default null,
  p_care_recipient_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := auth.uid();
  v_recipient uuid;
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

  if p_care_recipient_id is null then
    v_recipient := private.self_care_recipient(v_patient_id);
  else
    select id into v_recipient from public.care_recipients
    where id = p_care_recipient_id and account_id = v_patient_id;
    if not found then
      raise exception 'invalid_care_recipient';
    end if;
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
    where care_recipient_id = v_recipient and doctor_id = p_doctor_id
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
      doctor_id, patient_id, care_recipient_id, starts_at, ends_at, reason,
      doctor_name, doctor_specialization, consultation_fee, timezone,
      patient_name, patient_email, patient_phone
    ) values (
      p_doctor_id, v_patient_id, v_recipient, p_starts_at, v_slot.ends_at,
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

revoke execute on function public.book_appointment(uuid, timestamptz, text, uuid) from public, anon;
grant execute on function public.book_appointment(uuid, timestamptz, text, uuid) to authenticated;
