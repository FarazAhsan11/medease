-- MedEase: in-app notifications, doctor time off and appointment reminders
-- (NTF-01, NTF-02, APT-04, APT-05). Safe to run more than once. Run after the
-- second factor migration.

-- Notifications (NTF-01) ---------------------------------------------------------
-- A row holds an event kind and a link, never free text or names, so nothing about
-- anyone's health sits here. The app turns the kind into words. Rows are written
-- by the triggers below, in the same transaction as the event, so no code path
-- can change something and forget to say so.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'appointment_booked', 'appointment_new', 'appointment_cancelled',
    'appointment_reminder', 'prescription_issued', 'prescription_updated',
    'prescription_cancelled', 'verification_approved',
    'verification_needs_info', 'verification_rejected'
  )),
  href text not null check (href ~ '^/[a-z]'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;

drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Clinical data needs a second factor" on public.notifications;
create policy "Clinical data needs a second factor" on public.notifications
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

-- Live updates in the bell. Realtime applies the policies above per subscriber.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

create or replace function private.notify(
  p_user_id uuid,
  p_kind text,
  p_href text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, href)
  values (p_user_id, p_kind, p_href);
$$;

revoke execute on function private.notify(uuid, text, text) from public;

create or replace function private.notify_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.patient_id, 'appointment_booked', '/patient/appointments');
    perform private.notify(new.doctor_id, 'appointment_new', '/doctor/appointments');
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    -- Whoever cancelled already knows.
    if new.cancelled_by = 'patient' then
      perform private.notify(new.doctor_id, 'appointment_cancelled', '/doctor/appointments');
    else
      perform private.notify(new.patient_id, 'appointment_cancelled', '/patient/appointments');
    end if;
  end if;
  return null;
end;
$$;

revoke execute on function private.notify_appointment() from public;

drop trigger if exists notify_appointment on public.appointments;
create trigger notify_appointment
  after insert or update of status on public.appointments
  for each row execute function private.notify_appointment();

create or replace function private.notify_prescription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_href text := '/patient/prescriptions/' || new.id::text;
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      new.patient_id,
      case when new.replaces_id is null then 'prescription_issued' else 'prescription_updated' end,
      v_href
    );
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    perform private.notify(new.patient_id, 'prescription_cancelled', v_href);
  end if;
  return null;
end;
$$;

revoke execute on function private.notify_prescription() from public;

drop trigger if exists notify_prescription on public.prescriptions;
create trigger notify_prescription
  after insert or update of status on public.prescriptions
  for each row execute function private.notify_prescription();

create or replace function private.notify_verification()
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
      '/doctor/verification'
    );
  end if;
  return null;
end;
$$;

revoke execute on function private.notify_verification() from public;

drop trigger if exists notify_verification on public.doctor_profiles;
create trigger notify_verification
  after update of verification_status on public.doctor_profiles
  for each row execute function private.notify_verification();

-- One, or all of the caller's own when no id is given.
create or replace function public.mark_notifications_read(p_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not private.second_factor_ok() then
    raise exception 'not_signed_in';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = v_uid
    and read_at is null
    and (p_id is null or id = p_id);
end;
$$;

revoke execute on function public.mark_notifications_read(uuid) from public, anon;
grant execute on function public.mark_notifications_read(uuid) to authenticated;

-- Doctor time off (APT-04) ---------------------------------------------------------
-- Whole days in the doctor's timezone. New bookings stop at once; existing ones
-- stay until the doctor cancels them, which tells each patient.

create table if not exists public.doctor_time_off (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table public.doctor_time_off
  drop constraint if exists doctor_time_off_no_overlap;
alter table public.doctor_time_off
  add constraint doctor_time_off_no_overlap
    exclude using gist (doctor_id with =, daterange(starts_on, ends_on, '[]') with &&);

alter table public.doctor_time_off enable row level security;
revoke all on public.doctor_time_off from anon, authenticated;
grant select on public.doctor_time_off to authenticated;
grant all on public.doctor_time_off to service_role;

drop policy if exists "Doctors read their time off" on public.doctor_time_off;
create policy "Doctors read their time off" on public.doctor_time_off
  for select to authenticated
  using ((select auth.uid()) = doctor_id);

drop trigger if exists require_second_factor on public.doctor_time_off;
create trigger require_second_factor
  before insert or update or delete on public.doctor_time_off
  for each statement execute function private.require_second_factor();

create or replace function public.add_doctor_time_off(
  p_starts_on date,
  p_ends_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_id uuid;
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'doctor' then
    raise exception 'not_doctor';
  end if;

  select (now() at time zone d.timezone)::date into v_today
  from public.doctor_profiles d where d.id = v_uid;
  if not found then
    raise exception 'not_doctor';
  end if;

  if p_starts_on is null or p_ends_on is null
    or p_ends_on < p_starts_on
    or p_starts_on < v_today
    or p_ends_on > v_today + 365 then
    raise exception 'invalid_time_off';
  end if;

  begin
    insert into public.doctor_time_off (doctor_id, starts_on, ends_on)
    values (v_uid, p_starts_on, p_ends_on)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'time_off_overlap';
  end;

  return v_id;
end;
$$;

revoke execute on function public.add_doctor_time_off(date, date) from public, anon;
grant execute on function public.add_doctor_time_off(date, date) to authenticated;

create or replace function public.remove_doctor_time_off(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.doctor_time_off
  where id = p_id and doctor_id = auth.uid();

  if not found then
    raise exception 'time_off_not_found';
  end if;
end;
$$;

revoke execute on function public.remove_doctor_time_off(uuid) from public, anon;
grant execute on function public.remove_doctor_time_off(uuid) to authenticated;

-- Same as before, skipping days off. book_appointment reads this, so a day off
-- can't be booked either.
create or replace function public.get_doctor_slots(
  p_doctor_id uuid,
  p_days integer default 14
)
returns table (starts_at timestamptz, ends_at timestamptz, is_booked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with doctor as (
    select d.id, d.timezone, make_interval(mins => d.slot_minutes) as step
    from public.doctor_directory d
    where d.id = p_doctor_id and d.accepting_appointments
  ),
  all_days as (
    select doctor.*, (now() at time zone doctor.timezone)::date + n as day
    from doctor, generate_series(0, least(greatest(p_days, 1), 30) - 1) as n
  ),
  days as (
    select * from all_days d
    where not exists (
      select 1 from public.doctor_time_off t
      where t.doctor_id = d.id and d.day between t.starts_on and t.ends_on
    )
  ),
  slots as (
    select distinct (s.local_start at time zone days.timezone) as starts_at, days.step
    from days
    join public.doctor_availability a
      on a.doctor_id = days.id and a.weekday = extract(dow from days.day)
    cross join lateral generate_series(
      days.day + a.start_time,
      days.day + a.end_time - days.step,
      days.step
    ) as s(local_start)
  )
  select
    s.starts_at,
    s.starts_at + s.step,
    exists (
      select 1 from public.appointments ap
      where ap.doctor_id = p_doctor_id
        and ap.status <> 'cancelled'
        and ap.starts_at < s.starts_at + s.step
        and ap.ends_at > s.starts_at
    )
  from slots s
  where s.starts_at > now() + interval '30 minutes'
  order by s.starts_at;
$$;

revoke execute on function public.get_doctor_slots(uuid, integer) from public;
grant execute on function public.get_doctor_slots(uuid, integer) to anon, authenticated;

-- Appointment reminders (APT-05) ---------------------------------------------------
-- 24 hours and 1 hour before. The scheduled job claims what's due here and then
-- emails it. Claiming inserts a row, so a retried or overlapping run finds nothing
-- left: nobody hears twice. Due is a window, not a moment, so a late run still
-- works, and someone who booked 5 hours ahead only gets the 1-hour one.

create table if not exists public.appointment_reminders (
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  kind text not null check (kind in ('24h', '1h')),
  sent_at timestamptz not null default now(),
  primary key (appointment_id, kind)
);

alter table public.appointment_reminders enable row level security;
revoke all on public.appointment_reminders from public, anon, authenticated, service_role;

create or replace function public.claim_appointment_reminders()
returns table (
  appointment_id uuid,
  kind text,
  patient_name text,
  patient_email text,
  starts_at timestamptz,
  timezone text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_due record;
begin
  for v_due in
    select
      a.id, a.patient_id, a.patient_name, a.patient_email, a.starts_at, a.timezone,
      case when a.starts_at <= now() + interval '1 hour' then '1h' else '24h' end as due_kind
    from public.appointments a
    where a.status = 'booked'
      and a.starts_at > now()
      and a.starts_at <= now() + interval '24 hours'
      and a.created_at <= a.starts_at - case
        when a.starts_at <= now() + interval '1 hour' then interval '1 hour'
        else interval '24 hours'
      end
  loop
    insert into public.appointment_reminders (appointment_id, kind)
    values (v_due.id, v_due.due_kind)
    on conflict do nothing;

    if found then
      perform private.notify(v_due.patient_id, 'appointment_reminder', '/patient/appointments');

      appointment_id := v_due.id;
      kind := v_due.due_kind;
      patient_name := v_due.patient_name;
      patient_email := v_due.patient_email;
      starts_at := v_due.starts_at;
      timezone := v_due.timezone;
      return next;
    end if;
  end loop;

  -- Section 6.2: notifications and the send log are kept 90 days.
  delete from public.notifications where created_at < now() - interval '90 days';
  delete from public.appointment_reminders where sent_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.claim_appointment_reminders() from public, anon, authenticated;
grant execute on function public.claim_appointment_reminders() to service_role;
