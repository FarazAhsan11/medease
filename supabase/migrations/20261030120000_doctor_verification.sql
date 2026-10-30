-- MedEase: doctor verification, the admin role and the audit log (ADM-01 to
-- ADM-03, ADM-05, AUTH-04, DIR-02, PRC-08, FIX-07, SEC-04). Safe to run more
-- than once. Run after the booking fixes migration.
--
-- Every doctor starts as `pending` and stays out of doctor_directory, so they
-- can't be found or booked, until an admin approves them. Admins need a second
-- factor: private.is_admin() checks the session's assurance level, so a stolen
-- password alone can't reach anything here.

-- Admins ------------------------------------------------------------------------
-- The role sits in app_metadata, which only the secret key can write. Admin
-- accounts are created by scripts/create-admin.mjs, never by sign-up.

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Server code using the secret key can read the directory too.
grant usage on schema private to service_role;
grant execute on function private.has_confirmed_email(uuid) to service_role;

-- Audit log (SEC-04) ---------------------------------------------------------------
-- Append-only: nobody gets update or delete, not even the secret key. No foreign
-- keys, so entries outlive the accounts they name. Ids and actions only, never
-- health content or free text.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id, created_at desc);
create index if not exists audit_log_target_idx
  on public.audit_log (target_id, created_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated, service_role;

create or replace function private.write_audit(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id, details)
  values (
    auth.uid(),
    auth.jwt() -> 'app_metadata' ->> 'role',
    p_action,
    p_target_type,
    p_target_id,
    p_details
  );
$$;

revoke execute on function private.write_audit(text, text, uuid, jsonb) from public;

-- Doctor verification ---------------------------------------------------------------
-- pending -> approved | rejected, or needs_info -> (new documents) -> pending.
-- Doctors can't update these columns: their column grants don't include them.

alter table public.doctor_profiles
  add column if not exists license_document_path text,
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'needs_info', 'approved', 'rejected')),
  add column if not exists verification_note text
    check (char_length(verification_note) <= 500),
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid;

-- Public doctor directory (ADM-03, DIR-02) -----------------------------------------
-- Same columns as before plus the registration number for the verified badge.
-- get_doctor_slots and book_appointment read through this view, so an
-- unapproved doctor has no slots and can't be booked.

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
  d.created_at,
  d.license_number
from public.doctor_profiles d
where d.verification_status = 'approved'
  and private.has_confirmed_email(d.id);

grant select on public.doctor_directory to anon, authenticated;

-- Doctors send their documents ---------------------------------------------------------
-- The files are already in Storage, in the doctor's own folder, by this point.
-- New documents answer a request for more information, so the doctor goes back
-- into the queue. Reviewed files can't be replaced.

create or replace function public.save_verification_documents(
  p_photo_path text default null,
  p_license_path text default null,
  p_degree_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctor_id uuid := auth.uid();
  v_status text;
begin
  if v_doctor_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;

  select verification_status into v_status
  from public.doctor_profiles
  where id = v_doctor_id
  for update;

  if not found then
    raise exception 'doctor_not_found';
  end if;
  if v_status not in ('pending', 'needs_info') then
    raise exception 'verification_closed';
  end if;

  if exists (
    select 1
    from unnest(array[p_photo_path, p_license_path, p_degree_path]) as path
    where path is not null and split_part(path, '/', 1) <> v_doctor_id::text
  ) then
    raise exception 'invalid_path';
  end if;

  update public.doctor_profiles
  set photo_path = coalesce(p_photo_path, photo_path),
      license_document_path = coalesce(p_license_path, license_document_path),
      degree_path = coalesce(p_degree_path, degree_path),
      verification_status = 'pending',
      verification_note = null
  where id = v_doctor_id;

  perform private.write_audit('doctor.documents_submitted', 'doctor', v_doctor_id);
end;
$$;

revoke execute on function public.save_verification_documents(text, text, text) from public, anon;
grant execute on function public.save_verification_documents(text, text, text) to authenticated;

-- Admins review doctors (ADM-02) ---------------------------------------------------

create or replace function public.admin_doctor_reviews(p_doctor_id uuid default null)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  email_confirmed boolean,
  phone text,
  age smallint,
  gender text,
  specialization text,
  license_number text,
  clinic_address text,
  city text,
  photo_path text,
  license_document_path text,
  degree_path text,
  verification_status text,
  verification_note text,
  verified_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin';
  end if;

  return query
  select
    d.id,
    d.first_name,
    d.last_name,
    u.email::text,
    u.email_confirmed_at is not null,
    d.phone,
    d.age,
    d.gender,
    d.specialization,
    d.license_number,
    d.clinic_address,
    d.city,
    d.photo_path,
    d.license_document_path,
    d.degree_path,
    d.verification_status,
    d.verification_note,
    d.verified_at,
    d.created_at
  from public.doctor_profiles d
  join auth.users u on u.id = d.id
  where p_doctor_id is null or d.id = p_doctor_id
  order by d.verification_status = 'pending' desc, d.created_at;
end;
$$;

revoke execute on function public.admin_doctor_reviews(uuid) from public, anon;
grant execute on function public.admin_doctor_reviews(uuid) to authenticated;

-- Returns only what the app needs to email the doctor. The note stays behind
-- sign-in, on the doctor's verification page.
create or replace function public.admin_review_doctor(
  p_doctor_id uuid,
  p_decision text,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctor public.doctor_profiles;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
  v_email text;
begin
  if not private.is_admin() then
    raise exception 'not_admin';
  end if;

  if p_decision is null or p_decision not in ('approved', 'needs_info', 'rejected') then
    raise exception 'invalid_decision';
  end if;
  if p_decision <> 'approved' and v_note is null then
    raise exception 'note_required';
  end if;

  select * into v_doctor
  from public.doctor_profiles
  where id = p_doctor_id
  for update;

  if not found then
    raise exception 'doctor_not_found';
  end if;
  if v_doctor.verification_status not in ('pending', 'needs_info') then
    raise exception 'already_reviewed';
  end if;

  if p_decision = 'approved' then
    if not private.has_confirmed_email(p_doctor_id) then
      raise exception 'email_not_confirmed';
    end if;
    if v_doctor.photo_path is null
      or v_doctor.license_document_path is null
      or v_doctor.degree_path is null then
      raise exception 'documents_missing';
    end if;
  end if;

  update public.doctor_profiles
  set verification_status = p_decision,
      verification_note = case when p_decision = 'approved' then null else v_note end,
      verified_at = case when p_decision = 'approved' then now() end,
      verified_by = case when p_decision = 'approved' then auth.uid() end
  where id = p_doctor_id;

  perform private.write_audit('doctor.' || p_decision, 'doctor', p_doctor_id);

  select u.email into v_email from auth.users u where u.id = p_doctor_id;
  return v_email;
end;
$$;

revoke execute on function public.admin_review_doctor(uuid, text, text) from public, anon;
grant execute on function public.admin_review_doctor(uuid, text, text) to authenticated;

-- Admins open the documents of the doctor they're reviewing, through signed links.
drop policy if exists "Admins read doctor documents" on storage.objects;
create policy "Admins read doctor documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'doctor-documents' and private.is_admin());

-- Audit log viewer (ADM-05) ----------------------------------------------------------
-- p_user_id matches who acted or who it was done to.

create or replace function public.admin_audit_log(
  p_user_id uuid default null,
  p_action text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id bigint,
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text,
  target_type text,
  target_id uuid,
  target_email text,
  created_at timestamptz,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin';
  end if;

  return query
  select
    a.id,
    a.actor_id,
    actor.email::text,
    a.actor_role,
    a.action,
    a.target_type,
    a.target_id,
    target.email::text,
    a.created_at,
    count(*) over ()
  from public.audit_log a
  left join auth.users actor on actor.id = a.actor_id
  left join auth.users target on target.id = a.target_id
  where (p_user_id is null or a.actor_id = p_user_id or a.target_id = p_user_id)
    and (p_action is null or a.action = p_action)
    and (p_from is null or a.created_at >= p_from)
    and (p_to is null or a.created_at <= p_to)
  order by a.created_at desc, a.id desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.admin_audit_log(uuid, text, timestamptz, timestamptz, integer, integer) from public, anon;
grant execute on function public.admin_audit_log(uuid, text, timestamptz, timestamptz, integer, integer) to authenticated;
