-- MedEase: profile tables for patients, doctors, and labs, plus a private
-- bucket for doctor documents. Safe to run more than once.
--
-- Run it in Supabase Dashboard > SQL Editor, or with `supabase db push`.
--
-- Rows are created by the sign-up Server Action with the secret key, so there
-- are no insert policies. Each user can read and update only their own row.
-- The role itself lives in auth.users.raw_app_meta_data (app_metadata.role).

-- Keep updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Patients -------------------------------------------------------------------

create table if not exists public.patient_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  phone text not null check (char_length(phone) between 7 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Doctors --------------------------------------------------------------------

create table if not exists public.doctor_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  phone text not null check (char_length(phone) between 7 and 20),
  age smallint not null check (age between 21 and 100),
  gender text not null check (gender in ('Male', 'Female', 'Other')),
  specialization text not null check (char_length(specialization) <= 80),
  license_number text not null check (char_length(license_number) between 1 and 40),
  clinic_address text not null check (char_length(clinic_address) between 1 and 300),
  -- Object paths inside the private doctor-documents bucket.
  photo_path text,
  degree_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Labs -----------------------------------------------------------------------

create table if not exists public.lab_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  lab_name text not null check (char_length(lab_name) between 1 and 120),
  registration_number text not null check (char_length(registration_number) between 1 and 40),
  contact_person text not null check (char_length(contact_person) between 1 and 120),
  phone text not null check (char_length(phone) between 7 and 20),
  address text not null check (char_length(address) between 1 and 300),
  services text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers, privileges, and RLS for all three tables --------------------------

do $$
declare
  profile_table text;
begin
  foreach profile_table in array array['patient_profiles', 'doctor_profiles', 'lab_profiles']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', profile_table);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      profile_table
    );

    -- Guests get nothing; signed-in users are limited by the policies below.
    execute format('revoke all on public.%I from anon', profile_table);
    execute format('grant select, update on public.%I to authenticated', profile_table);
    execute format('grant all on public.%I to service_role', profile_table);

    execute format('alter table public.%I enable row level security', profile_table);

    execute format('drop policy if exists "Read own profile" on public.%I', profile_table);
    execute format(
      'create policy "Read own profile" on public.%I
         for select to authenticated
         using ((select auth.uid()) = id)',
      profile_table
    );

    execute format('drop policy if exists "Update own profile" on public.%I', profile_table);
    execute format(
      'create policy "Update own profile" on public.%I
         for update to authenticated
         using ((select auth.uid()) = id)
         with check ((select auth.uid()) = id)',
      profile_table
    );
  end loop;
end;
$$;

-- Doctor documents -----------------------------------------------------------
-- Private bucket; files are stored as <user id>/photo.<ext> and
-- <user id>/degree.pdf. Uploads happen server-side with the secret key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'doctor-documents',
  'doctor-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Doctors read own documents" on storage.objects;
create policy "Doctors read own documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'doctor-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
