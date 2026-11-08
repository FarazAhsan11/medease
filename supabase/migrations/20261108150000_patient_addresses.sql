-- MedEase: patient address book (PRO-07). Safe to run more than once. Design in
-- docs/addresses.md.
--
-- Saved addresses for home sample collection and, later, medicine delivery.
-- Bookings will copy the address they use, so an address can always be edited
-- or deleted without changing where a past booking went.

-- The cities addresses can be in, and later the cities labs collect in (LAB-06),
-- so the two always match. Keep in step with src/lib/cities.ts; test:sql
-- compares them.
create or replace function private.cities()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'Abbottabad', 'Bahawalpur', 'Faisalabad', 'Gujranwala', 'Gujrat',
    'Hyderabad', 'Islamabad', 'Jhelum', 'Karachi', 'Lahore', 'Mardan',
    'Multan', 'Peshawar', 'Quetta', 'Rahim Yar Khan', 'Rawalpindi', 'Sahiwal',
    'Sargodha', 'Sheikhupura', 'Sialkot', 'Sukkur'
  ];
$$;

revoke execute on function private.cities() from public;

create table if not exists public.patient_addresses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.patient_profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  street_address text not null check (char_length(street_address) between 1 and 200),
  area text not null check (char_length(area) between 1 and 80),
  city text not null,
  landmark text check (char_length(landmark) between 1 and 120),
  contact_name text check (char_length(contact_name) between 1 and 80),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 -]{7,20}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Separate, so running this again picks up a changed list.
alter table public.patient_addresses
  drop constraint if exists patient_addresses_city_check;
alter table public.patient_addresses
  add constraint patient_addresses_city_check check (city = any (private.cities()));

-- Lists an account's addresses; also serves the limit count.
create index if not exists patient_addresses_account_idx
  on public.patient_addresses (account_id, created_at);

-- One default per account.
create unique index if not exists patient_addresses_one_default
  on public.patient_addresses (account_id) where is_default;

drop trigger if exists set_updated_at on public.patient_addresses;
create trigger set_updated_at
  before update on public.patient_addresses
  for each row execute function public.set_updated_at();

alter table public.patient_addresses enable row level security;
revoke all on public.patient_addresses from public, anon, authenticated, service_role;
grant select on public.patient_addresses to authenticated;

drop policy if exists "Patients read their addresses" on public.patient_addresses;
create policy "Patients read their addresses" on public.patient_addresses
  for select to authenticated
  using ((select auth.uid()) = account_id);

-- Personal data that finds someone's door: same two-factor rule as the profile.
drop policy if exists "Clinical data needs a second factor" on public.patient_addresses;
create policy "Clinical data needs a second factor" on public.patient_addresses
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.patient_addresses;
create trigger require_second_factor
  before insert or update or delete on public.patient_addresses
  for each statement execute function private.require_second_factor();

-- Saving -------------------------------------------------------------------------
-- Adds an address, or updates one when p_id is given. The first address becomes
-- the default; p_is_default moves the default here. Unsetting the default isn't
-- possible by itself: another address has to be made the default instead.

create or replace function public.save_patient_address(
  p_id uuid,
  p_label text,
  p_street_address text,
  p_area text,
  p_city text,
  p_contact_phone text,
  p_landmark text default null,
  p_contact_name text default null,
  p_is_default boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_default boolean := coalesce(p_is_default, false);
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient'
    or not exists (select 1 from public.patient_profiles where id = v_uid) then
    raise exception 'not_patient';
  end if;

  -- One save at a time per account, so two tabs can't pass the limit or leave
  -- two defaults.
  perform 1 from public.patient_profiles where id = v_uid for update;

  if p_id is null then
    if (select count(*) from public.patient_addresses where account_id = v_uid) >= 10 then
      raise exception 'too_many_addresses';
    end if;
    if not exists (select 1 from public.patient_addresses where account_id = v_uid) then
      v_default := true;
    end if;
  else
    if not exists (
      select 1 from public.patient_addresses where id = p_id and account_id = v_uid
    ) then
      raise exception 'address_not_found';
    end if;
  end if;

  if v_default then
    update public.patient_addresses
    set is_default = false
    where account_id = v_uid and is_default and id is distinct from p_id;
  end if;

  begin
    if p_id is null then
      insert into public.patient_addresses (
        account_id, label, street_address, area, city, landmark, contact_name,
        contact_phone, is_default
      ) values (
        v_uid,
        trim(p_label),
        trim(p_street_address),
        trim(p_area),
        trim(p_city),
        nullif(trim(coalesce(p_landmark, '')), ''),
        nullif(trim(coalesce(p_contact_name, '')), ''),
        trim(p_contact_phone),
        v_default
      )
      returning id into v_id;
    else
      update public.patient_addresses
      set label = trim(p_label),
          street_address = trim(p_street_address),
          area = trim(p_area),
          city = trim(p_city),
          landmark = nullif(trim(coalesce(p_landmark, '')), ''),
          contact_name = nullif(trim(coalesce(p_contact_name, '')), ''),
          contact_phone = trim(p_contact_phone),
          -- Keeps the default when it was already this one.
          is_default = is_default or v_default
      where id = p_id and account_id = v_uid
      returning id into v_id;
    end if;
  exception
    when check_violation or not_null_violation then
      raise exception 'invalid_address';
  end;

  return v_id;
end;
$$;

revoke execute on function public.save_patient_address(
  uuid, text, text, text, text, text, text, text, boolean
) from public, anon;
grant execute on function public.save_patient_address(
  uuid, text, text, text, text, text, text, text, boolean
) to authenticated;

-- Deleting -----------------------------------------------------------------------
-- Bookings keep their own copy, so any address can go. If it was the default,
-- the oldest remaining address takes over: the first one in the list after it.

create or replace function public.delete_patient_address(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_was_default boolean;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient'
    or not exists (select 1 from public.patient_profiles where id = v_uid) then
    raise exception 'not_patient';
  end if;

  perform 1 from public.patient_profiles where id = v_uid for update;

  delete from public.patient_addresses
  where id = p_id and account_id = v_uid
  returning is_default into v_was_default;

  if not found then
    raise exception 'address_not_found';
  end if;

  if v_was_default then
    update public.patient_addresses
    set is_default = true
    where id = (
      select id from public.patient_addresses
      where account_id = v_uid
      order by created_at, id
      limit 1
    );
  end if;
end;
$$;

revoke execute on function public.delete_patient_address(uuid) from public, anon;
grant execute on function public.delete_patient_address(uuid) to authenticated;
