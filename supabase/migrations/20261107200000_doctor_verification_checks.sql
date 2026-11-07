-- MedEase: the lab verification checks, for doctors too (ADM-02, SEC-06).
-- Safe to run more than once. Run after the lab verification migration, which
-- creates private.checked_uploads and mark_upload_checked.
--
-- 1. save_verification_documents takes a file only once the server has
--    checked it (verifyUpload, then mark_upload_checked), at a path the app
--    made, so calling it directly can't skip the check.
-- 2. Each submission sets submitted_at; admin_review_doctor takes the one the
--    admin looked at and refuses the decision if the doctor has sent new
--    documents since.

alter table public.doctor_profiles
  add column if not exists submitted_at timestamptz;

-- Doctors send their documents ---------------------------------------------------------

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
  v_file record;
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

  -- The extensions are the ones documentRules stores each kind with.
  for v_file in
    select *
    from (values
      (p_photo_path, 'photo', 'jpg|png|webp'),
      (p_license_path, 'license', 'pdf|jpg|png'),
      (p_degree_path, 'degree', 'pdf')
    ) as f(path, kind, extensions)
    where f.path is not null
  loop
    if v_file.path !~ (
      '^' || v_doctor_id::text || '/' || v_file.kind
        || '-[0-9a-f-]{36}\.(' || v_file.extensions || ')$'
    ) then
      raise exception 'invalid_path';
    end if;
  end loop;

  for v_file in
    select f.path
    from unnest(array[p_photo_path, p_license_path, p_degree_path]) as f(path)
    where f.path is not null
  loop
    delete from private.checked_uploads
    where bucket = 'doctor-documents'
      and path = v_file.path
      and owner_id = v_doctor_id;
    if not found then
      raise exception 'upload_not_checked';
    end if;
  end loop;

  update public.doctor_profiles
  set photo_path = coalesce(p_photo_path, photo_path),
      license_document_path = coalesce(p_license_path, license_document_path),
      degree_path = coalesce(p_degree_path, degree_path),
      verification_status = 'pending',
      verification_note = null,
      submitted_at = clock_timestamp()
  where id = v_doctor_id;

  perform private.write_audit('doctor.documents_submitted', 'doctor', v_doctor_id);
end;
$$;

revoke execute on function public.save_verification_documents(text, text, text) from public, anon;
grant execute on function public.save_verification_documents(text, text, text) to authenticated;

-- Admins review doctors (ADM-02) ---------------------------------------------------
-- Same as before, plus submitted_at for the decision to send back.

drop function if exists public.admin_doctor_reviews(uuid);

create function public.admin_doctor_reviews(p_doctor_id uuid default null)
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
  submitted_at timestamptz,
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
    d.submitted_at,
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

-- p_submitted_at is the submission the admin looked at. Returns only what the
-- app needs to email the doctor; the note stays behind sign-in.

drop function if exists public.admin_review_doctor(uuid, text, text);

create or replace function public.admin_review_doctor(
  p_doctor_id uuid,
  p_decision text,
  p_submitted_at timestamptz,
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
  if v_doctor.submitted_at is distinct from p_submitted_at then
    raise exception 'details_changed';
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

revoke execute on function public.admin_review_doctor(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.admin_review_doctor(uuid, text, timestamptz, text) to authenticated;
