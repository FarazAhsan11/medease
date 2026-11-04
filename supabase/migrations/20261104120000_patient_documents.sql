-- MedEase: patient documents (REC-02)
--
-- Patients keep their own reports, scans and outside prescriptions. Only the
-- patient reads them for now: doctors get access through sharing (REC-03), which
-- waits for malware scanning (SEC-06). Safe to run more than once.
--
-- Files go from the browser straight to Storage on a signed upload link, into
-- <patient id>/incoming/. The server checks what arrived (verifyUpload) and moves
-- it to <patient id>/<uuid>.<ext> before recording it. add_patient_document only
-- accepts a file outside incoming/, so a direct call can't record an unchecked
-- file: only the server's secret key can put one there.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No Storage policies for this bucket: the server opens a file with the secret
-- key, after reading its row with the patient's own session.

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  care_recipient_id uuid not null,
  kind text not null
    check (kind in ('lab_report', 'imaging', 'prescription', 'discharge_summary', 'other')),
  title text not null check (char_length(title) between 1 and 120),
  document_on date,
  storage_path text not null unique,
  content_type text not null
    check (content_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint check (size_bytes > 0),
  created_at timestamptz not null default now(),
  constraint patient_documents_care_recipient_fkey
    foreign key (care_recipient_id, patient_id)
    references public.care_recipients (id, account_id)
    deferrable initially deferred
);

create index if not exists patient_documents_patient_idx
  on public.patient_documents (patient_id, created_at desc);
create index if not exists patient_documents_care_recipient_idx
  on public.patient_documents (care_recipient_id, created_at desc);

-- Read only: writes go through add_patient_document and delete_patient_document.
alter table public.patient_documents enable row level security;
revoke all on public.patient_documents from anon, authenticated;
grant select on public.patient_documents to authenticated;
grant all on public.patient_documents to service_role;

drop policy if exists "Patients read their documents" on public.patient_documents;
create policy "Patients read their documents" on public.patient_documents
  for select to authenticated
  using ((select auth.uid()) = patient_id);

drop policy if exists "Clinical data needs a second factor" on public.patient_documents;
create policy "Clinical data needs a second factor" on public.patient_documents
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.patient_documents;
create trigger require_second_factor
  before insert or update or delete on public.patient_documents
  for each statement execute function private.require_second_factor();

-- Adding ---------------------------------------------------------------------------
-- The file is already checked and in place. The care recipient defaults to the
-- patient themself; an account holds at most 500 documents.

create or replace function public.add_patient_document(
  p_path text,
  p_kind text,
  p_title text,
  p_document_on date default null,
  p_care_recipient_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_recipient uuid;
  v_extension text;
  v_size bigint;
  v_id uuid;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if p_care_recipient_id is null then
    v_recipient := private.self_care_recipient(v_uid);
  else
    select id into v_recipient from public.care_recipients
    where id = p_care_recipient_id and account_id = v_uid;
    if not found then
      raise exception 'care_recipient_not_found';
    end if;
  end if;

  if p_path is null
    or p_path !~ ('^' || v_uid::text || '/[0-9a-f-]{36}\.(pdf|jpg|png)$') then
    raise exception 'invalid_path';
  end if;

  select (o.metadata ->> 'size')::bigint into v_size
  from storage.objects o
  where o.bucket_id = 'patient-documents' and o.name = p_path;
  if not found then
    raise exception 'file_not_found';
  end if;

  if p_kind is null
    or p_kind not in ('lab_report', 'imaging', 'prescription', 'discharge_summary', 'other')
    or char_length(v_title) not between 1 and 120
    or p_document_on < date '1900-01-01'
    or p_document_on > current_date + 1 then
    raise exception 'invalid_document';
  end if;

  -- Locking the account's self row makes concurrent uploads count in turn.
  perform 1 from public.care_recipients
  where account_id = v_uid and relation = 'self'
  for update;
  if (select count(*) from public.patient_documents where patient_id = v_uid) >= 500 then
    raise exception 'document_limit';
  end if;

  v_extension := substring(p_path from '\.([a-z]+)$');
  insert into public.patient_documents (
    patient_id, care_recipient_id, kind, title, document_on,
    storage_path, content_type, size_bytes
  ) values (
    v_uid, v_recipient, p_kind, v_title, p_document_on,
    p_path,
    case v_extension when 'pdf' then 'application/pdf'
                     when 'jpg' then 'image/jpeg'
                     else 'image/png' end,
    nullif(v_size, 0)
  )
  on conflict (storage_path) do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'document_exists';
  end if;
  return v_id;
end;
$$;

revoke execute on function public.add_patient_document(text, text, text, date, uuid) from public, anon;
grant execute on function public.add_patient_document(text, text, text, date, uuid) to authenticated;

-- Deleting -------------------------------------------------------------------------
-- Returns the file's path so the server can remove it from Storage.

create or replace function public.delete_patient_document(p_document_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_path text;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  delete from public.patient_documents
  where id = p_document_id and patient_id = v_uid
  returning storage_path into v_path;

  if v_path is null then
    raise exception 'document_not_found';
  end if;
  return v_path;
end;
$$;

revoke execute on function public.delete_patient_document(uuid) from public, anon;
grant execute on function public.delete_patient_document(uuid) to authenticated;

-- Audit trail ------------------------------------------------------------------------

create or replace function private.after_patient_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('patient_document.added', 'patient_document', new.id);
  else
    perform private.write_audit('patient_document.deleted', 'patient_document', old.id);
  end if;
  return null;
end;
$$;

revoke execute on function private.after_patient_document() from public;

drop trigger if exists after_patient_document on public.patient_documents;
create trigger after_patient_document
  after insert or delete on public.patient_documents
  for each row execute function private.after_patient_document();
