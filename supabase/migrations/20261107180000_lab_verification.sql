-- MedEase: lab verification (ADM-04, AUTH-04, CMPL-04). Safe to run more than
-- once. Run after the messaging migration.
--
-- Same flow as doctors (20261030120000_doctor_verification.sql): every lab
-- starts as `pending` and stays out of lab_directory until an admin has checked
-- its licence with the provincial healthcare commission. Labs send their
-- registration number, licensing authority, address and licence file through
-- save_lab_verification; an admin decides through admin_review_lab.

-- Lab profiles ------------------------------------------------------------------
-- pending -> approved | rejected, or needs_info -> (new details) -> pending.
-- submitted_at marks each submission, so an admin's decision can be tied to
-- the version they looked at.

alter table public.lab_profiles
  add column if not exists licensing_authority text
    check (licensing_authority in ('punjab', 'sindh', 'kp', 'islamabad', 'balochistan', 'other')),
  add column if not exists license_document_path text,
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'needs_info', 'approved', 'rejected')),
  add column if not exists verification_note text
    check (char_length(verification_note) <= 500),
  add column if not exists submitted_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid;

-- The admin queue: pending labs oldest first, then the rest newest first.
create index if not exists lab_profiles_verification_idx
  on public.lab_profiles (verification_status, created_at);
create index if not exists lab_profiles_created_idx
  on public.lab_profiles (created_at desc);

-- Labs edit their contact details directly, but not what an admin verifies
-- (registration number, licensing authority, address, licence file) or the
-- status. Those change only through save_lab_verification, while under review.
revoke update on public.lab_profiles from authenticated;
grant update (lab_name, contact_person, phone, services)
  on public.lab_profiles to authenticated;

-- Public lab directory ------------------------------------------------------------
-- Only approved labs with a confirmed email. Anything that shows labs to
-- patients (LAB-02, LAB-03) reads through this view.

create or replace view public.lab_directory
with (security_invoker = false) as
select
  l.id,
  l.lab_name,
  l.address,
  l.phone,
  l.services,
  l.registration_number,
  l.licensing_authority,
  l.created_at
from public.lab_profiles l
where l.verification_status = 'approved'
  and private.has_confirmed_email(l.id);

grant select on public.lab_directory to anon, authenticated;

-- Licence files -------------------------------------------------------------------
-- Private bucket, paths <lab id>/license-<uuid>.<ext>. No insert policy: the
-- only way in is a signed upload link, issued while the lab is under review.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lab-documents',
  'lab-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Labs read own documents" on storage.objects;
create policy "Labs read own documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lab-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Admins read lab documents" on storage.objects;
create policy "Admins read lab documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'lab-documents' and private.is_admin());

-- Checked uploads ---------------------------------------------------------------------
-- The browser uploads straight to Storage, so only the server can read the
-- bytes (verifyUpload). It records each file it passed here, with the secret
-- key; save_lab_verification takes a file only once it's recorded, so calling
-- the function directly can't skip the check.

create table if not exists private.checked_uploads (
  bucket text not null,
  path text not null,
  owner_id uuid not null,
  checked_at timestamptz not null default now(),
  primary key (bucket, path)
);

create index if not exists checked_uploads_owner_idx
  on private.checked_uploads (owner_id, checked_at);

revoke all on private.checked_uploads from public, anon, authenticated, service_role;

create or replace function public.mark_upload_checked(
  p_bucket text,
  p_path text,
  p_owner_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  -- A record is used within the same request; older ones are leftovers.
  delete from private.checked_uploads
  where owner_id = p_owner_id and checked_at < now() - interval '1 day';

  insert into private.checked_uploads (bucket, path, owner_id)
  values (p_bucket, p_path, p_owner_id)
  on conflict (bucket, path) do nothing;
$$;

revoke execute on function public.mark_upload_checked(text, text, uuid) from public, anon, authenticated;
grant execute on function public.mark_upload_checked(text, text, uuid) to service_role;

-- Labs send their details ----------------------------------------------------------
-- A new licence file must be one the server checked. Answers a request for
-- more information too, so the lab goes back into the queue. Returns the
-- licence file this replaced, for the app to delete. Needs the second factor,
-- like everything a lab account does.

create or replace function public.save_lab_verification(
  p_registration_number text,
  p_licensing_authority text,
  p_address text,
  p_license_path text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
  v_lab public.lab_profiles;
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;
  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  select * into v_lab
  from public.lab_profiles
  where id = v_lab_id
  for update;

  if not found then
    raise exception 'lab_not_found';
  end if;
  if v_lab.verification_status not in ('pending', 'needs_info') then
    raise exception 'verification_closed';
  end if;

  if p_license_path is not null then
    if p_license_path !~ ('^' || v_lab_id::text || '/license-[0-9a-f-]{36}\.(pdf|jpg|png)$') then
      raise exception 'invalid_path';
    end if;
    delete from private.checked_uploads
    where bucket = 'lab-documents'
      and path = p_license_path
      and owner_id = v_lab_id;
    if not found then
      raise exception 'upload_not_checked';
    end if;
  end if;

  -- The table's checks refuse blank or overlong values and unknown authorities.
  update public.lab_profiles
  set registration_number = trim(p_registration_number),
      licensing_authority = p_licensing_authority,
      address = trim(p_address),
      license_document_path = coalesce(p_license_path, license_document_path),
      verification_status = 'pending',
      verification_note = null,
      submitted_at = clock_timestamp()
  where id = v_lab_id;

  perform private.write_audit('lab.details_submitted', 'lab', v_lab_id);

  return case
    when p_license_path is not null
      and v_lab.license_document_path is distinct from p_license_path
    then v_lab.license_document_path
  end;
end;
$$;

revoke execute on function public.save_lab_verification(text, text, text, text) from public, anon;
grant execute on function public.save_lab_verification(text, text, text, text) to authenticated;

-- Admins review labs (ADM-04) -------------------------------------------------------
-- One lab by its id, or the queue: pending labs oldest first, then up to
-- p_limit of the rest, newest first. Both halves read an index.

drop function if exists public.admin_lab_reviews(uuid);
drop function if exists public.admin_lab_reviews(uuid, integer);

create function public.admin_lab_reviews(
  p_lab_id uuid default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  lab_name text,
  email text,
  email_confirmed boolean,
  contact_person text,
  phone text,
  address text,
  services text[],
  registration_number text,
  licensing_authority text,
  license_document_path text,
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
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  if not private.is_admin() then
    raise exception 'not_admin';
  end if;

  if p_lab_id is not null then
    return query
    select l.id, l.lab_name, u.email::text, u.email_confirmed_at is not null,
      l.contact_person, l.phone, l.address, l.services, l.registration_number,
      l.licensing_authority, l.license_document_path, l.verification_status,
      l.verification_note, l.submitted_at, l.verified_at, l.created_at
    from public.lab_profiles l
    join auth.users u on u.id = l.id
    where l.id = p_lab_id;
    return;
  end if;

  return query
  select l.id, l.lab_name, u.email::text, u.email_confirmed_at is not null,
    l.contact_person, l.phone, l.address, l.services, l.registration_number,
    l.licensing_authority, l.license_document_path, l.verification_status,
    l.verification_note, l.submitted_at, l.verified_at, l.created_at
  from (
    select p.* from public.lab_profiles p
    where p.verification_status = 'pending'
    order by p.created_at
    limit v_limit
  ) l
  join auth.users u on u.id = l.id
  order by l.created_at;

  return query
  select l.id, l.lab_name, u.email::text, u.email_confirmed_at is not null,
    l.contact_person, l.phone, l.address, l.services, l.registration_number,
    l.licensing_authority, l.license_document_path, l.verification_status,
    l.verification_note, l.submitted_at, l.verified_at, l.created_at
  from (
    select p.* from public.lab_profiles p
    where p.verification_status <> 'pending'
    order by p.created_at desc
    limit v_limit
  ) l
  join auth.users u on u.id = l.id
  order by l.created_at desc;
end;
$$;

revoke execute on function public.admin_lab_reviews(uuid, integer) from public, anon;
grant execute on function public.admin_lab_reviews(uuid, integer) to authenticated;

-- p_submitted_at is the submission the admin looked at: if the lab has sent
-- new details since, the decision is refused and the admin reloads. Returns
-- only what the app needs to email the lab; the note stays behind sign-in.

drop function if exists public.admin_review_lab(uuid, text, text);

create or replace function public.admin_review_lab(
  p_lab_id uuid,
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
  v_lab public.lab_profiles;
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

  select * into v_lab
  from public.lab_profiles
  where id = p_lab_id
  for update;

  if not found then
    raise exception 'lab_not_found';
  end if;
  if v_lab.verification_status not in ('pending', 'needs_info') then
    raise exception 'already_reviewed';
  end if;
  if v_lab.submitted_at is distinct from p_submitted_at then
    raise exception 'details_changed';
  end if;

  if p_decision = 'approved' then
    if not private.has_confirmed_email(p_lab_id) then
      raise exception 'email_not_confirmed';
    end if;
    if v_lab.license_document_path is null or v_lab.licensing_authority is null then
      raise exception 'documents_missing';
    end if;
  end if;

  update public.lab_profiles
  set verification_status = p_decision,
      verification_note = case when p_decision = 'approved' then null else v_note end,
      verified_at = case when p_decision = 'approved' then now() end,
      verified_by = case when p_decision = 'approved' then auth.uid() end
  where id = p_lab_id;

  perform private.write_audit('lab.' || p_decision, 'lab', p_lab_id);

  select u.email into v_email from auth.users u where u.id = p_lab_id;
  return v_email;
end;
$$;

revoke execute on function public.admin_review_lab(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.admin_review_lab(uuid, text, timestamptz, text) to authenticated;

-- In-app notice of the decision (the bell), like doctors get.
create or replace function private.notify_lab_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verification_status is distinct from old.verification_status
    and new.verification_status in ('approved', 'needs_info', 'rejected') then
    perform private.notify(
      new.id,
      'verification_' || new.verification_status,
      '/lab/verification'
    );
  end if;
  return null;
end;
$$;

revoke execute on function private.notify_lab_verification() from public;

drop trigger if exists notify_lab_verification on public.lab_profiles;
create trigger notify_lab_verification
  after update of verification_status on public.lab_profiles
  for each row execute function private.notify_lab_verification();
