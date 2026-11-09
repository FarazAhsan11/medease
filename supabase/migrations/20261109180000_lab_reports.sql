-- MedEase: lab reports (LAB-05). Safe to run more than once. Run after the lab
-- booking status migration.
--
-- The lab uploads the report as a PDF for a booking it's processing; the
-- booking moves to report ready in the same step, so a patient told their
-- report is ready can always open it. The report is filed in the patient's
-- records. Corrected versions (LAB-18) add rows; this migration writes the
-- first one.
-- Design: docs/lab-booking.md ("Reports").

-- Files -----------------------------------------------------------------------------
-- Private bucket, paths <lab id>/<booking id>/<uuid>.pdf. No storage policies:
-- the only way in is a signed upload link, and the only way out a signed link
-- the server makes after reading the report row with the reader's own session.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lab-reports',
  'lab-reports',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Reports ---------------------------------------------------------------------------
-- One current report per booking; a replaced one keeps its row and file, marked
-- with when it was replaced (LAB-18), as a lab keeps the original of a
-- corrected report.

create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  -- Copied from the booking so row-level security reads each row directly.
  lab_id uuid not null,
  patient_id uuid not null,
  care_recipient_id uuid not null,
  version integer not null default 1 check (version between 1 and 20),
  storage_path text not null unique,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  replaced_at timestamptz,
  unique (booking_id, version),
  foreign key (booking_id, lab_id, patient_id)
    references public.lab_bookings (id, lab_id, patient_id) on delete cascade
);

-- The person tested belongs to the account, checked at commit so an account
-- can be deleted with its people, bookings and reports in one go.
alter table public.lab_reports
  drop constraint if exists lab_reports_care_recipient_fkey;
alter table public.lab_reports
  add constraint lab_reports_care_recipient_fkey
    foreign key (care_recipient_id, patient_id)
    references public.care_recipients (id, account_id)
    deferrable initially deferred;

create unique index if not exists lab_reports_current_idx
  on public.lab_reports (booking_id) where replaced_at is null;
-- The patient's records and the lab's recent reports, newest first.
create index if not exists lab_reports_patient_idx
  on public.lab_reports (patient_id, created_at desc) where replaced_at is null;
create index if not exists lab_reports_lab_idx
  on public.lab_reports (lab_id, created_at desc) where replaced_at is null;
create index if not exists lab_reports_care_recipient_idx
  on public.lab_reports (care_recipient_id);

-- Same rules as the bookings: the patient and the lab read their own rows, with
-- a second factor; nobody writes directly (rows come from publish_lab_report).
alter table public.lab_reports enable row level security;
revoke all on public.lab_reports from public, anon, authenticated, service_role;
grant select on public.lab_reports to authenticated;

drop policy if exists "Patients read their lab reports" on public.lab_reports;
create policy "Patients read their lab reports" on public.lab_reports
  for select to authenticated
  using (patient_id = (select auth.uid()));

drop policy if exists "Labs read their reports" on public.lab_reports;
create policy "Labs read their reports" on public.lab_reports
  for select to authenticated
  using (lab_id = (select auth.uid()));

drop policy if exists "Clinical data needs a second factor" on public.lab_reports;
create policy "Clinical data needs a second factor" on public.lab_reports
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.lab_reports;
create trigger require_second_factor
  before insert or update or delete on public.lab_reports
  for each statement execute function private.require_second_factor();

-- Report ready means there's a report ----------------------------------------------
-- Whatever the path, a booking reaches report ready only with a current report,
-- so move_lab_booking can no longer mark it ready by itself.

create or replace function private.require_lab_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.lab_reports
    where booking_id = new.id and replaced_at is null
  ) then
    raise exception 'report_required';
  end if;
  return new;
end;
$$;

revoke execute on function private.require_lab_report() from public;

drop trigger if exists require_lab_report on public.lab_bookings;
create trigger require_lab_report
  before update of status on public.lab_bookings
  for each row
  when (new.status = 'report_ready' and old.status is distinct from new.status)
  execute function private.require_lab_report();

-- Publishing -------------------------------------------------------------------------
-- The app uploads the file on a signed link, checks it (verifyUpload) and
-- records it as checked with the secret key; this takes only a recorded file at
-- the booking's own path. Moving to report ready tells the patient through the
-- status notice and adds the history row.

create or replace function public.publish_lab_report(
  p_booking_id uuid,
  p_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
  v_booking public.lab_bookings;
  v_report_id uuid;
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and lab_id = v_lab_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  -- Only a booking being processed; a second click finds it ready already.
  if v_booking.status <> 'processing' then
    raise exception 'status_changed';
  end if;

  if p_path is null or p_path !~ (
    '^' || v_lab_id::text || '/' || v_booking.id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  ) then
    raise exception 'invalid_path';
  end if;

  delete from private.checked_uploads
  where bucket = 'lab-reports'
    and path = p_path
    and owner_id = v_lab_id;
  if not found then
    raise exception 'upload_not_checked';
  end if;

  insert into public.lab_reports (
    booking_id, lab_id, patient_id, care_recipient_id, storage_path, uploaded_by
  ) values (
    v_booking.id, v_booking.lab_id, v_booking.patient_id,
    v_booking.care_recipient_id, p_path, v_lab_id
  )
  returning id into v_report_id;

  update public.lab_bookings
  set status = 'report_ready',
      status_reason = null,
      status_note = null,
      status_changed_at = now()
  where id = v_booking.id;

  perform private.write_audit(
    'lab_report.published', 'lab_booking', v_booking.id,
    jsonb_build_object('report_id', v_report_id)
  );

  return v_report_id;
end;
$$;

revoke execute on function public.publish_lab_report(uuid, text) from public, anon;
grant execute on function public.publish_lab_report(uuid, text) to authenticated;
