-- MedEase: the patient cancels or reschedules a lab booking (LAB-20). Safe to
-- run more than once. Run after the lab reports migration.
--
-- Until the sample is taken, the patient can cancel with a reason or move the
-- booking to another day (lab visit) or window (home collection). The lab is
-- told either way, and the history keeps every change.
-- Design: docs/lab-booking.md ("Patient changes").

-- Who cancelled, and how often the booking was moved --------------------------------

alter table public.lab_bookings add column if not exists cancelled_by text;
alter table public.lab_bookings
  add column if not exists reschedule_count smallint not null default 0;

-- Every cancellation so far came from the lab (LAB-04).
update public.lab_bookings set cancelled_by = 'lab'
where status = 'cancelled' and cancelled_by is null;

alter table public.lab_bookings drop constraint if exists lab_bookings_cancelled_by_check;
alter table public.lab_bookings add constraint lab_bookings_cancelled_by_check
  check (
    (status = 'cancelled') = (cancelled_by is not null)
    and coalesce(cancelled_by in ('patient', 'lab'), true)
  );

alter table public.lab_bookings drop constraint if exists lab_bookings_reschedule_count_check;
alter table public.lab_bookings add constraint lab_bookings_reschedule_count_check
  check (reschedule_count between 0 and 3);

-- The patient's reasons are their own list, so the lab's list can't be used to
-- speak for them and the other way round.
alter table public.lab_bookings drop constraint if exists lab_bookings_status_reason_check;
alter table public.lab_bookings add constraint lab_bookings_status_reason_check
  check (
    (status = 'recollection_needed' and status_reason in (
      'sample_haemolysed', 'sample_clotted', 'not_enough_sample',
      'label_problem', 'sample_delayed', 'other'
    ))
    or (status = 'cancelled' and coalesce(cancelled_by = 'lab', false) and status_reason in (
      'patient_request', 'patient_unreachable', 'patient_absent',
      'test_unavailable', 'collection_unavailable', 'other'
    ))
    or (status = 'cancelled' and coalesce(cancelled_by = 'patient', false) and status_reason in (
      'no_longer_needed', 'booked_by_mistake', 'another_lab',
      'time_unsuitable', 'other'
    ))
    or (status not in ('recollection_needed', 'cancelled') and status_reason is null)
  );

-- History: a move to a new time is kept next to the status moves ------------------------

alter table public.lab_booking_events
  add column if not exists kind text not null default 'status';
alter table public.lab_booking_events add column if not exists visit_date date;
alter table public.lab_booking_events add column if not exists slot_starts_at timestamptz;

alter table public.lab_booking_events drop constraint if exists lab_booking_events_kind_check;
alter table public.lab_booking_events add constraint lab_booking_events_kind_check
  check (
    kind = 'status' and visit_date is null and slot_starts_at is null
    or kind = 'rescheduled' and visit_date is not null
  );

-- The lab moves a booking: unchanged rules, and a cancellation is the lab's --------

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
        status_changed_at = now(),
        cancelled_by = case when p_to_status = 'cancelled' then 'lab' end
    where id = v_booking.id;
  exception when check_violation then
    raise exception 'invalid_reason';
  end;
end;
$$;

revoke execute on function public.move_lab_booking(uuid, text, text, text, text) from public, anon;
grant execute on function public.move_lab_booking(uuid, text, text, text, text) to authenticated;

-- The patient cancels ------------------------------------------------------------------
-- Until the sample is taken: booked, or waiting for a new sample. Cancelling
-- again returns quietly, so a double click is harmless.

create or replace function public.cancel_lab_booking(
  p_booking_id uuid,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := auth.uid();
  v_booking public.lab_bookings;
  v_note text := nullif(
    btrim(replace(coalesce(p_note, ''), E'\r\n', E'\n'), E' \t\n\r'),
    ''
  );
begin
  if v_patient_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if p_booking_id is null then
    raise exception 'booking_not_found';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and patient_id = v_patient_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status = 'cancelled' and v_booking.cancelled_by = 'patient' then
    return;
  end if;
  if v_booking.status not in ('booked', 'recollection_needed') then
    raise exception 'not_changeable';
  end if;

  if p_reason is null then
    raise exception 'reason_required';
  end if;
  -- Otherwise the lab would see "other" and nothing more.
  if p_reason = 'other' and v_note is null then
    raise exception 'note_required';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'invalid_note';
  end if;

  begin
    update public.lab_bookings
    set status = 'cancelled',
        status_reason = p_reason,
        status_note = v_note,
        status_changed_at = now(),
        cancelled_by = 'patient'
    where id = v_booking.id;
  exception when check_violation then
    raise exception 'invalid_reason';
  end;
end;
$$;

revoke execute on function public.cancel_lab_booking(uuid, text, text) from public, anon;
grant execute on function public.cancel_lab_booking(uuid, text, text) to authenticated;

-- The patient moves the booking to a new time ----------------------------------------
-- A lab visit takes p_visit_date (today to 13 days ahead, lab time); a home
-- collection takes p_slot_starts_at, a window with a place left, under the
-- same lock as booking. The tests, address and price stay as booked: changing
-- those is a new booking. Moving to the time it already has returns quietly.

create or replace function public.reschedule_lab_booking(
  p_booking_id uuid,
  p_visit_date date default null,
  p_slot_starts_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := auth.uid();
  v_booking public.lab_bookings;
  v_today date;
  v_slot record;
  v_visit_date date;
  v_slot_starts_at timestamptz;
  v_slot_ends_at timestamptz;
  v_settings public.lab_collection_settings;
begin
  if v_patient_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if p_booking_id is null then
    raise exception 'booking_not_found';
  end if;

  select * into v_booking
  from public.lab_bookings
  where id = p_booking_id and patient_id = v_patient_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status not in ('booked', 'recollection_needed') then
    raise exception 'not_changeable';
  end if;

  v_today := (now() at time zone v_booking.timezone)::date;

  if v_booking.collection = 'lab' then
    if p_visit_date is null or p_slot_starts_at is not null
      or p_visit_date not between v_today and v_today + 13 then
      raise exception 'invalid_visit_date';
    end if;
    if p_visit_date = v_booking.visit_date then
      return;
    end if;
    if not exists (select 1 from public.lab_directory where id = v_booking.lab_id) then
      raise exception 'lab_not_found';
    end if;
    v_visit_date := p_visit_date;
  else
    if p_slot_starts_at is null or p_visit_date is not null then
      raise exception 'slot_unavailable';
    end if;
    if p_slot_starts_at = v_booking.slot_starts_at then
      return;
    end if;
    select * into v_settings from public.lab_collection_settings
    where lab_id = v_booking.lab_id and accepting;
    if not found then
      raise exception 'not_collecting';
    end if;
    -- Every test still drawn at home, alone or in a package, as when booking.
    if exists (
      select 1
      from public.lab_booking_items i
      join public.lab_tests t on t.id = i.lab_test_id
      where i.booking_id = v_booking.id and not t.home_collection
    ) or exists (
      select 1
      from public.lab_booking_items i
      join public.lab_package_items p on p.package_id = i.package_id
      join public.lab_tests t on t.id = p.lab_test_id
      where i.booking_id = v_booking.id and not t.home_collection
    ) then
      raise exception 'no_home_collection';
    end if;
    if not exists (
      select 1 from public.lab_service_areas
      where lab_id = v_booking.lab_id and city = v_booking.city
    ) then
      raise exception 'area_not_served';
    end if;
  end if;

  if v_booking.reschedule_count >= 3 then
    raise exception 'reschedule_limit';
  end if;

  if v_booking.collection = 'home' then
    -- The same key as book_lab_test, so the two can't both take the last place.
    perform pg_advisory_xact_lock(
      hashtextextended(
        'lab_slot:' || v_booking.lab_id::text || ':'
          || extract(epoch from p_slot_starts_at)::bigint::text,
        0
      )
    );

    select * into v_slot
    from public.get_lab_collection_slots(v_booking.lab_id, 14) s
    where s.starts_at = p_slot_starts_at;
    if not found then
      raise exception 'slot_unavailable';
    end if;
    if v_slot.spots_left < 1 then
      raise exception 'slot_full';
    end if;
    v_slot_starts_at := v_slot.starts_at;
    v_slot_ends_at := v_slot.ends_at;
    -- The day the window was offered under, in the lab's collection time zone.
    v_visit_date := (v_slot_starts_at at time zone v_settings.timezone)::date;
  end if;

  update public.lab_bookings
  set visit_date = v_visit_date,
      slot_starts_at = v_slot_starts_at,
      slot_ends_at = v_slot_ends_at,
      timezone = coalesce(v_settings.timezone, timezone),
      reschedule_count = reschedule_count + 1
  where id = v_booking.id;
end;
$$;

revoke execute on function public.reschedule_lab_booking(uuid, date, timestamptz) from public, anon;
grant execute on function public.reschedule_lab_booking(uuid, date, timestamptz) to authenticated;

-- A new time: kept in the history and told to the lab -----------------------------------

create or replace function private.log_lab_booking_rescheduled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lab_booking_events (
    booking_id, lab_id, patient_id, status, kind, visit_date, slot_starts_at, changed_by
  ) values (
    new.id, new.lab_id, new.patient_id, new.status, 'rescheduled',
    new.visit_date, new.slot_starts_at, auth.uid()
  );
  perform private.notify(new.lab_id, 'lab_booking_rescheduled', '/lab/bookings');
  return null;
end;
$$;

revoke execute on function private.log_lab_booking_rescheduled() from public;

drop trigger if exists log_lab_booking_rescheduled on public.lab_bookings;
create trigger log_lab_booking_rescheduled
  after update of visit_date, slot_starts_at on public.lab_bookings
  for each row
  when (
    old.visit_date is distinct from new.visit_date
    or old.slot_starts_at is distinct from new.slot_starts_at
  )
  execute function private.log_lab_booking_rescheduled();

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
    'lab_booking_cancelled', 'lab_booking_rescheduled'
  ));

-- Whoever cancelled already knows: a patient's cancellation tells the lab.
create or replace function private.notify_lab_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and new.cancelled_by = 'patient' then
    perform private.notify(new.lab_id, 'lab_booking_cancelled', '/lab/bookings?stage=finished');
  else
    perform private.notify(new.patient_id, 'lab_booking_' || new.status, '/patient/lab-tests');
  end if;
  return null;
end;
$$;

revoke execute on function private.notify_lab_booking_status() from public;
