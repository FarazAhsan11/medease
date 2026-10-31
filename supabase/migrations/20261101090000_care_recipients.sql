-- MedEase: who receives care, and the medical profile (PRO-01, the PRO-03 data
-- change). Safe to run more than once. Run after the doctor verification
-- migration.
--
-- An account can look after other people, so the person being treated is no
-- longer assumed to be the account holder. Each patient account has one `self`
-- row in care_recipients, and later one row per dependent. Clinical tables carry
-- care_recipient_id next to patient_id; RLS keeps checking the owning account.
-- This has to land before more clinical tables exist, or each would need the same
-- migration later.
--
-- Today every booking is for the patient themself: triggers fill in the self row,
-- so book_appointment and issue_prescription don't change. Booking for a
-- dependent (APT-09) passes a recipient explicitly.

-- Contact details that belong to the account -----------------------------------

alter table public.patient_profiles
  add column if not exists home_address text
    check (char_length(home_address) <= 300),
  add column if not exists emergency_contact_name text
    check (char_length(emergency_contact_name) <= 120),
  add column if not exists emergency_contact_phone text
    check (char_length(emergency_contact_phone) between 7 and 20);

-- Saved through save_patient_profile, so the two tables change together.
revoke update on public.patient_profiles from authenticated;
drop policy if exists "Update own profile" on public.patient_profiles;

-- Care recipients --------------------------------------------------------------

create table if not exists public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  relation text not null default 'self'
    check (relation in ('self', 'child', 'parent', 'spouse', 'sibling', 'other')),
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  date_of_birth date,
  gender text check (gender in ('Male', 'Female', 'Other')),
  blood_group text
    check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies text[] not null default '{}'
    check (cardinality(allergies) <= 30),
  chronic_conditions text[] not null default '{}'
    check (cardinality(chronic_conditions) <= 30),
  current_medicines text[] not null default '{}'
    check (cardinality(current_medicines) <= 30),
  height_cm smallint check (height_cm between 30 and 272),
  weight_kg numeric(4, 1) check (weight_kg between 0.5 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets clinical tables prove a recipient belongs to their patient.
  unique (id, account_id)
);

create unique index if not exists care_recipients_one_self_per_account
  on public.care_recipients (account_id) where relation = 'self';
create index if not exists care_recipients_account_idx
  on public.care_recipients (account_id);

drop trigger if exists set_updated_at on public.care_recipients;
create trigger set_updated_at before update on public.care_recipients
  for each row execute function public.set_updated_at();

alter table public.care_recipients enable row level security;
revoke all on public.care_recipients from anon, authenticated;
grant select on public.care_recipients to authenticated;
grant all on public.care_recipients to service_role;

drop policy if exists "Account holders read their care recipients" on public.care_recipients;
create policy "Account holders read their care recipients" on public.care_recipients
  for select to authenticated
  using ((select auth.uid()) = account_id);

-- The account's own row. Created on demand, so an old account with no profile
-- row (or one mid-sign-up) still gets one rather than failing a booking.

create or replace function private.self_care_recipient(p_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_first text;
  v_last text;
  v_full text;
begin
  select id into v_id from public.care_recipients
  where account_id = p_account_id and relation = 'self';
  if found then
    return v_id;
  end if;

  select first_name, last_name into v_first, v_last
  from public.patient_profiles where id = p_account_id;

  if not found then
    select coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), 'Patient')
      into v_full
    from auth.users where id = p_account_id;

    v_first := left(split_part(v_full, ' ', 1), 60);
    v_last := left(nullif(trim(substr(v_full, char_length(v_first) + 1)), ''), 60);
  end if;

  insert into public.care_recipients (account_id, relation, first_name, last_name)
  values (p_account_id, 'self', v_first, coalesce(v_last, '-'))
  on conflict (account_id) where relation = 'self' do nothing
  returning id into v_id;

  -- A concurrent booking may have created it between the select and the insert.
  if v_id is null then
    select id into v_id from public.care_recipients
    where account_id = p_account_id and relation = 'self';
  end if;

  return v_id;
end;
$$;

revoke execute on function private.self_care_recipient(uuid) from public;

-- The account holder's name stays in one place, patient_profiles.
create or replace function private.sync_self_care_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.self_care_recipient(new.id);

  update public.care_recipients
  set first_name = new.first_name, last_name = new.last_name
  where account_id = new.id
    and relation = 'self'
    and (first_name, last_name) is distinct from (new.first_name, new.last_name);

  return null;
end;
$$;

revoke execute on function private.sync_self_care_recipient() from public;

drop trigger if exists sync_self_care_recipient on public.patient_profiles;
create trigger sync_self_care_recipient
  after insert or update of first_name, last_name on public.patient_profiles
  for each row execute function private.sync_self_care_recipient();

-- Existing accounts and records -------------------------------------------------

do $$
begin
  perform private.self_care_recipient(p.id) from public.patient_profiles p;
  perform private.self_care_recipient(a.patient_id)
  from (select distinct patient_id from public.appointments) a;
end;
$$;

alter table public.appointments add column if not exists care_recipient_id uuid;
alter table public.prescriptions add column if not exists care_recipient_id uuid;

-- A backfill isn't an edit, so updated_at keeps its real value.
alter table public.appointments disable trigger set_updated_at;
alter table public.prescriptions disable trigger set_updated_at;

update public.appointments a
set care_recipient_id = c.id
from public.care_recipients c
where a.care_recipient_id is null
  and c.account_id = a.patient_id
  and c.relation = 'self';

update public.prescriptions p
set care_recipient_id = a.care_recipient_id
from public.appointments a
where p.care_recipient_id is null
  and a.id = p.appointment_id;

alter table public.appointments enable trigger set_updated_at;
alter table public.prescriptions enable trigger set_updated_at;

-- Pairing the id with the account means a record can never name someone from
-- another account. Deferred to commit so deleting an account can remove its
-- recipients and records in one go, while deleting only a recipient who has
-- records is refused.

alter table public.appointments
  drop constraint if exists appointments_care_recipient_fkey;
alter table public.appointments
  add constraint appointments_care_recipient_fkey
    foreign key (care_recipient_id, patient_id)
    references public.care_recipients (id, account_id)
    deferrable initially deferred;

alter table public.prescriptions
  drop constraint if exists prescriptions_care_recipient_fkey;
alter table public.prescriptions
  add constraint prescriptions_care_recipient_fkey
    foreign key (care_recipient_id, patient_id)
    references public.care_recipients (id, account_id)
    deferrable initially deferred;

alter table public.appointments alter column care_recipient_id set not null;
alter table public.prescriptions alter column care_recipient_id set not null;

create index if not exists appointments_care_recipient_idx
  on public.appointments (care_recipient_id, starts_at desc);
create index if not exists prescriptions_care_recipient_idx
  on public.prescriptions (care_recipient_id, issued_at desc);

-- New records name their recipient --------------------------------------------

create or replace function private.set_appointment_care_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.care_recipient_id is null then
    new.care_recipient_id := private.self_care_recipient(new.patient_id);
  end if;
  return new;
end;
$$;

revoke execute on function private.set_appointment_care_recipient() from public;

drop trigger if exists set_care_recipient on public.appointments;
create trigger set_care_recipient before insert on public.appointments
  for each row execute function private.set_appointment_care_recipient();

create or replace function private.set_prescription_care_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.care_recipient_id is null then
    select a.care_recipient_id into new.care_recipient_id
    from public.appointments a
    where a.id = new.appointment_id;
  end if;
  return new;
end;
$$;

revoke execute on function private.set_prescription_care_recipient() from public;

drop trigger if exists set_care_recipient on public.prescriptions;
create trigger set_care_recipient before insert on public.prescriptions
  for each row execute function private.set_prescription_care_recipient();

-- Saving the profile (PRO-01) -----------------------------------------------------
-- Everything on the settings page, in one transaction. Lists are trimmed, blanks
-- and repeats dropped, order kept.

create or replace function private.clean_list(p_items text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(item order by first_seen), '{}')
  from (
    select trim(value) as item, min(ord) as first_seen
    from unnest(p_items) with ordinality as list(value, ord)
    where nullif(trim(value), '') is not null
    group by trim(value)
  ) cleaned;
$$;

revoke execute on function private.clean_list(text[]) from public;

create or replace function public.save_patient_profile(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_date_of_birth date default null,
  p_gender text default null,
  p_blood_group text default null,
  p_height_cm integer default null,
  p_weight_kg numeric default null,
  p_allergies text[] default '{}',
  p_chronic_conditions text[] default '{}',
  p_current_medicines text[] default '{}',
  p_home_address text default null,
  p_emergency_contact_name text default null,
  p_emergency_contact_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_recipient uuid;
  v_allergies text[] := private.clean_list(p_allergies);
  v_conditions text[] := private.clean_list(p_chronic_conditions);
  v_medicines text[] := private.clean_list(p_current_medicines);
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient'
    or not exists (select 1 from public.patient_profiles where id = v_uid) then
    raise exception 'not_patient';
  end if;

  if p_date_of_birth is not null
    and (p_date_of_birth > current_date
      or p_date_of_birth < current_date - interval '130 years') then
    raise exception 'invalid_date_of_birth';
  end if;

  if exists (
    select 1 from unnest(v_allergies || v_conditions || v_medicines) as item
    where char_length(item) > 100
  ) then
    raise exception 'invalid_profile';
  end if;

  begin
    update public.patient_profiles
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        phone = trim(p_phone),
        home_address = nullif(trim(coalesce(p_home_address, '')), ''),
        emergency_contact_name = nullif(trim(coalesce(p_emergency_contact_name, '')), ''),
        emergency_contact_phone = nullif(trim(coalesce(p_emergency_contact_phone, '')), '')
    where id = v_uid;

    v_recipient := private.self_care_recipient(v_uid);

    update public.care_recipients
    set date_of_birth = p_date_of_birth,
        gender = p_gender,
        blood_group = p_blood_group,
        height_cm = p_height_cm,
        weight_kg = p_weight_kg,
        allergies = v_allergies,
        chronic_conditions = v_conditions,
        current_medicines = v_medicines
    where id = v_recipient;
  exception
    when check_violation or not_null_violation or numeric_value_out_of_range then
      raise exception 'invalid_profile';
  end;
end;
$$;

revoke execute on function public.save_patient_profile(
  text, text, text, date, text, text, integer, numeric, text[], text[], text[], text, text, text
) from public, anon;
grant execute on function public.save_patient_profile(
  text, text, text, date, text, text, integer, numeric, text[], text[], text[], text, text, text
) to authenticated;
