-- MedEase: lab booking status moves (LAB-04). Safe to run more than once. Run
-- after the lab booking migration.
--
-- The lab moves a booking booked → sample collected → processing → report
-- ready, asks for a new sample, or cancels it with a reason. Every move is kept
-- in lab_booking_events and puts a notice in the patient's bell.
-- Design: docs/lab-booking.md ("Status moves").

-- The current status's reason and note, shown to the lab and the patient ----------

alter table public.lab_bookings add column if not exists status_reason text;
alter table public.lab_bookings add column if not exists status_note text;
alter table public.lab_bookings
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.lab_bookings drop constraint if exists lab_bookings_status_reason_check;
alter table public.lab_bookings add constraint lab_bookings_status_reason_check
  check (
    (status = 'recollection_needed' and status_reason in (
      'sample_haemolysed', 'sample_clotted', 'not_enough_sample',
      'label_problem', 'sample_delayed', 'other'
    ))
    or (status = 'cancelled' and status_reason in (
      'patient_request', 'patient_unreachable', 'patient_absent',
      'test_unavailable', 'collection_unavailable', 'other'
    ))
    or (status not in ('recollection_needed', 'cancelled') and status_reason is null)
  );

alter table public.lab_bookings drop constraint if exists lab_bookings_status_note_check;
alter table public.lab_bookings add constraint lab_bookings_status_note_check
  check (status_note is null or char_length(status_note) between 1 and 500);

-- The lab's working lists, in the order the app reads them: by visit day, a
-- day's lab visits (no window) before its windows. Open lists read forwards
-- from today and backwards for earlier days; the finished list backwards.
-- These replace the plain by-day index.
drop index if exists public.lab_bookings_lab_day_idx;
create index if not exists lab_bookings_lab_open_idx
  on public.lab_bookings (lab_id, visit_date, slot_starts_at nulls first, created_at)
  where status in ('booked', 'recollection_needed', 'sample_collected', 'processing');
create index if not exists lab_bookings_lab_finished_idx
  on public.lab_bookings (lab_id, visit_date, slot_starts_at nulls first, created_at)
  where status in ('report_ready', 'cancelled');

-- History -----------------------------------------------------------------------------

create table if not exists public.lab_booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  -- Copied from the booking so row-level security reads each row directly.
  lab_id uuid not null,
  patient_id uuid not null,
  status text not null check (status in (
    'booked', 'sample_collected', 'processing', 'report_ready', 'cancelled',
    'recollection_needed'
  )),
  reason text,
  note text,
  -- Who made the move: the patient for 'booked', the lab (later its staff)
  -- after that. Null for rows written without a signed-in user.
  changed_by uuid,
  created_at timestamptz not null default now(),
  foreign key (booking_id, lab_id, patient_id)
    references public.lab_bookings (id, lab_id, patient_id) on delete cascade
);

create index if not exists lab_booking_events_booking_idx
  on public.lab_booking_events (booking_id, created_at);

-- Bookings made before this migration get their 'booked' row.
insert into public.lab_booking_events (booking_id, lab_id, patient_id, status, changed_by, created_at)
select b.id, b.lab_id, b.patient_id, 'booked', b.patient_id, b.created_at
from public.lab_bookings b
where not exists (
  select 1 from public.lab_booking_events e where e.booking_id = b.id
);

-- Same rules as the bookings: the patient and the lab read their own rows, with
-- a second factor; nobody writes directly (rows come from the trigger below).
alter table public.lab_booking_events enable row level security;
revoke all on public.lab_booking_events from public, anon, authenticated, service_role;
grant select on public.lab_booking_events to authenticated;

drop policy if exists "Patients read their lab bookings" on public.lab_booking_events;
create policy "Patients read their lab bookings" on public.lab_booking_events
  for select to authenticated
  using (patient_id = (select auth.uid()));

drop policy if exists "Labs read their bookings" on public.lab_booking_events;
create policy "Labs read their bookings" on public.lab_booking_events
  for select to authenticated
  using (lab_id = (select auth.uid()));

drop policy if exists "Clinical data needs a second factor" on public.lab_booking_events;
create policy "Clinical data needs a second factor" on public.lab_booking_events
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.lab_booking_events;
create trigger require_second_factor
  before insert or update or delete on public.lab_booking_events
  for each statement execute function private.require_second_factor();

-- Kept by the database: a new booking and every status change add a row.
create or replace function private.log_lab_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lab_booking_events (
    booking_id, lab_id, patient_id, status, reason, note, changed_by
  ) values (
    new.id, new.lab_id, new.patient_id, new.status, new.status_reason,
    new.status_note, auth.uid()
  );
  return null;
end;
$$;

revoke execute on function private.log_lab_booking_status() from public;

drop trigger if exists log_lab_booking_status on public.lab_bookings;
create trigger log_lab_booking_status
  after insert on public.lab_bookings
  for each row execute function private.log_lab_booking_status();

-- Only a real change: writing the same status again isn't a move.
drop trigger if exists log_lab_booking_status_change on public.lab_bookings;
create trigger log_lab_booking_status_change
  after update of status on public.lab_bookings
  for each row
  when (old.status is distinct from new.status)
  execute function private.log_lab_booking_status();

-- Moves ---------------------------------------------------------------------------------
-- The lab names the status it sees, so a second click or a second person
-- acting on an old copy of the page is refused instead of moving twice.

create or replace function public.move_lab_booking(
  p_booking_id uuid,
  p_from_status text,
  p_to_status text,
  p_reason text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lab_id uuid := auth.uid();
  v_booking public.lab_bookings;
  -- Trimmed of spaces, tabs and line breaks, as the app does.
  v_note text := nullif(
    btrim(replace(coalesce(p_note, ''), E'\r\n', E'\n'), E' \t\n\r'),
    ''
  );
  v_needs_reason boolean := p_to_status in ('recollection_needed', 'cancelled');
begin
  if v_lab_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'lab' then
    raise exception 'not_lab';
  end if;

  if p_booking_id is null or p_from_status is null or p_to_status is null then
    raise exception 'invalid_move';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and lab_id = v_lab_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status <> p_from_status then
    raise exception 'status_changed';
  end if;

  if not (
    (p_from_status = 'booked' and p_to_status in ('sample_collected', 'cancelled'))
    or (p_from_status = 'recollection_needed' and p_to_status in ('sample_collected', 'cancelled'))
    or (p_from_status = 'sample_collected' and p_to_status in ('processing', 'recollection_needed', 'cancelled'))
    or (p_from_status = 'processing' and p_to_status in ('report_ready', 'recollection_needed', 'cancelled'))
  ) then
    raise exception 'invalid_move';
  end if;

  -- A sample can't be taken before the booked day.
  if p_from_status = 'booked' and p_to_status = 'sample_collected'
    and (now() at time zone v_booking.timezone)::date < v_booking.visit_date then
    raise exception 'too_early';
  end if;

  -- Which reasons fit which status is the table's check, the one list.
  if v_needs_reason and p_reason is null then
    raise exception 'reason_required';
  end if;
  if not v_needs_reason and p_reason is not null then
    raise exception 'invalid_reason';
  end if;
  if p_reason = 'other' and v_note is null then
    raise exception 'note_required';
  end if;

  if v_note is not null and (not v_needs_reason or char_length(v_note) > 500) then
    raise exception 'invalid_note';
  end if;

  begin
    update public.lab_bookings
    set status = p_to_status,
        status_reason = p_reason,
        status_note = v_note,
        status_changed_at = now()
    where id = v_booking.id;
  exception when check_violation then
    raise exception 'invalid_reason';
  end;
end;
$$;

revoke execute on function public.move_lab_booking(uuid, text, text, text, text) from public, anon;
grant execute on function public.move_lab_booking(uuid, text, text, text, text) to authenticated;

-- Notices -------------------------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'appointment_booked', 'appointment_new', 'appointment_cancelled',
    'appointment_reminder', 'prescription_issued', 'prescription_updated',
    'prescription_cancelled', 'verification_approved',
    'verification_needs_info', 'verification_rejected',
    'visit_summary_ready', 'visit_summary_updated',
    'lab_booking_booked', 'lab_booking_new',
    'lab_booking_sample_collected', 'lab_booking_processing',
    'lab_booking_report_ready', 'lab_booking_recollection_needed',
    'lab_booking_cancelled'
  ));

create or replace function private.notify_lab_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(new.patient_id, 'lab_booking_' || new.status, '/patient/lab-tests');
  return null;
end;
$$;

revoke execute on function private.notify_lab_booking_status() from public;

drop trigger if exists notify_lab_booking_status on public.lab_bookings;
create trigger notify_lab_booking_status
  after update of status on public.lab_bookings
  for each row
  when (old.status is distinct from new.status and new.status <> 'booked')
  execute function private.notify_lab_booking_status();
