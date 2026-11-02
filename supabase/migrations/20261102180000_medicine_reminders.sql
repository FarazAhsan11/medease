-- MED-01, MED-02: opt-in email reminders at each dose time.
-- Design: docs/roadmap.md, "Medicine reminders by email".
--
-- Run this before the app that reads these tables goes live: the patient settings
-- page reads medicine_reminder_settings. Until the route is live too, the job's
-- calls answer 404, which is harmless.
--
-- Safe to run more than once.

-- Settings ---------------------------------------------------------------------
-- No row means reminders are off. The token lets a link in an email turn them off
-- without signing in; it does nothing else.

create table if not exists public.medicine_reminder_settings (
  patient_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  morning_time time not null default '08:00',
  afternoon_time time not null default '14:00',
  night_time time not null default '21:00',
  timezone text not null default 'Asia/Karachi',
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.medicine_reminder_settings;
create trigger set_updated_at before update on public.medicine_reminder_settings
  for each row execute function public.set_updated_at();

alter table public.medicine_reminder_settings enable row level security;
revoke all on public.medicine_reminder_settings from public, anon, authenticated, service_role;
grant select on public.medicine_reminder_settings to authenticated;

drop policy if exists "Patients read their reminder settings" on public.medicine_reminder_settings;
create policy "Patients read their reminder settings" on public.medicine_reminder_settings
  for select to authenticated
  using ((select auth.uid()) = patient_id);

drop policy if exists "Clinical data needs a second factor" on public.medicine_reminder_settings;
create policy "Clinical data needs a second factor" on public.medicine_reminder_settings
  as restrictive
  for all to authenticated
  using ((select private.second_factor_ok()))
  with check ((select private.second_factor_ok()));

drop trigger if exists require_second_factor on public.medicine_reminder_settings;
create trigger require_second_factor
  before insert or update or delete on public.medicine_reminder_settings
  for each statement execute function private.require_second_factor();

-- Send log ---------------------------------------------------------------------
-- One row per patient, day and dose time, inserted before sending, so a retried or
-- overlapping run can't remind anyone twice. local_date is the patient's own day.
-- Nobody reads this directly, not even the secret key.

create table if not exists public.medicine_reminders (
  patient_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  dose_time text not null check (dose_time in ('morning', 'afternoon', 'night')),
  scheduled_for timestamptz not null,
  sent_at timestamptz not null default now(),
  emailed_at timestamptz,
  last_attempt_at timestamptz not null default now(),
  attempts integer not null default 1,
  primary key (patient_id, local_date, dose_time)
);

create index if not exists medicine_reminders_unsent_idx
  on public.medicine_reminders (scheduled_for) where emailed_at is null;
create index if not exists medicine_reminders_sent_at_idx
  on public.medicine_reminders (sent_at);

alter table public.medicine_reminders enable row level security;
revoke all on public.medicine_reminders from public, anon, authenticated, service_role;

-- Saving and unsubscribing -----------------------------------------------------

create or replace function public.save_medicine_reminders(
  p_enabled boolean,
  p_morning time,
  p_afternoon time,
  p_night time,
  p_timezone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'patient' then
    raise exception 'not_patient';
  end if;

  if (p_morning < p_afternoon and p_afternoon < p_night) is not true then
    raise exception 'invalid_reminder_times';
  end if;

  -- A zone Postgres can't read would stop the job for every patient.
  begin
    perform now() at time zone p_timezone;
  exception when invalid_parameter_value then
    raise exception 'invalid_timezone';
  end;

  insert into public.medicine_reminder_settings (
    patient_id, enabled, morning_time, afternoon_time, night_time, timezone
  ) values (
    v_uid, p_enabled, p_morning, p_afternoon, p_night, p_timezone
  )
  on conflict (patient_id) do update set
    enabled = excluded.enabled,
    morning_time = excluded.morning_time,
    afternoon_time = excluded.afternoon_time,
    night_time = excluded.night_time,
    timezone = excluded.timezone;
end;
$$;

revoke execute on function public.save_medicine_reminders(boolean, time, time, time, text) from public, anon;
grant execute on function public.save_medicine_reminders(boolean, time, time, time, text) to authenticated;

-- Reached from a link in an email, so the token is the only check. Called by the
-- server, which rate limits it.
create or replace function public.unsubscribe_medicine_reminders(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.medicine_reminder_settings
  set enabled = false
  where unsubscribe_token = p_token;

  return found;
end;
$$;

revoke execute on function public.unsubscribe_medicine_reminders(uuid) from public, anon, authenticated;
grant execute on function public.unsubscribe_medicine_reminders(uuid) to service_role;

-- What's due -------------------------------------------------------------------
-- The same course rules as getCourse in src/features/prescriptions/lib/prescriptions.ts,
-- on the clinic's calendar, so a reminder agrees with what the app shows that day.
-- "As needed" medicines have no dose times, so they never match.

create or replace function private.has_dose_due(p_patient_id uuid, p_dose_time text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.prescriptions p
    join public.prescription_items i on i.prescription_id = p.id
    cross join lateral (
      select
        (now() at time zone p.timezone)::date as today,
        (p.issued_at at time zone p.timezone)::date as start_day
    ) d
    where p.patient_id = p_patient_id
      and p.status = 'active'
      and p_dose_time = any (i.dose_times)
      and d.today >= d.start_day
      and (i.duration_days is null or d.today < d.start_day + i.duration_days)
      and (
        i.frequency = 'daily'
        or (i.frequency = 'weekly' and (d.today - d.start_day) % 7 = 0)
      )
  );
$$;

revoke execute on function private.has_dose_due(uuid, text) from public;

-- Claiming ---------------------------------------------------------------------
-- A reminder is due from its time until an hour later: the job runs every 15
-- minutes, and a dose reminder hours late could lead someone to double up. A failed
-- email comes back on later runs, 3 tries at most, 10 minutes apart, inside the same
-- hour, as long as the dose is still due and reminders are still on. The update
-- takes each row's lock, so overlapping runs can't both send one.

create or replace function public.claim_medicine_reminders()
returns table (
  patient_id uuid,
  local_date date,
  dose_time text,
  patient_name text,
  patient_email text,
  unsubscribe_token uuid
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
      s.patient_id, d.local_date, slot.dose_time, slot.scheduled_for,
      s.unsubscribe_token, pp.first_name, u.email
    from public.medicine_reminder_settings s
    join public.patient_profiles pp on pp.id = s.patient_id
    join auth.users u on u.id = s.patient_id
    cross join lateral (
      select (now() at time zone s.timezone)::date as local_date
    ) d
    cross join lateral (
      select
        v.dose_time,
        (d.local_date + v.at_time) at time zone s.timezone as scheduled_for
      from (values
        ('morning', s.morning_time),
        ('afternoon', s.afternoon_time),
        ('night', s.night_time)
      ) as v(dose_time, at_time)
    ) slot
    where s.enabled
      and u.email_confirmed_at is not null
      and slot.scheduled_for <= now()
      and slot.scheduled_for > now() - interval '1 hour'
      and private.has_dose_due(s.patient_id, slot.dose_time)
  loop
    insert into public.medicine_reminders (patient_id, local_date, dose_time, scheduled_for)
    values (v_due.patient_id, v_due.local_date, v_due.dose_time, v_due.scheduled_for)
    on conflict do nothing;

    if found then
      patient_id := v_due.patient_id;
      local_date := v_due.local_date;
      dose_time := v_due.dose_time;
      patient_name := v_due.first_name;
      patient_email := v_due.email;
      unsubscribe_token := v_due.unsubscribe_token;
      return next;
    end if;
  end loop;

  return query
  update public.medicine_reminders r
  set attempts = r.attempts + 1, last_attempt_at = now()
  from public.medicine_reminder_settings s
  join public.patient_profiles pp on pp.id = s.patient_id
  join auth.users u on u.id = s.patient_id
  where s.patient_id = r.patient_id
    and s.enabled
    and r.emailed_at is null
    and r.attempts < 3
    and r.last_attempt_at <= now() - interval '10 minutes'
    and r.scheduled_for > now() - interval '1 hour'
    and private.has_dose_due(r.patient_id, r.dose_time)
  returning r.patient_id, r.local_date, r.dose_time, pp.first_name, u.email::text, s.unsubscribe_token;

  -- Section 6.2: the send log is kept 90 days.
  delete from public.medicine_reminders where sent_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.claim_medicine_reminders() from public, anon, authenticated;
grant execute on function public.claim_medicine_reminders() to service_role;

create or replace function public.mark_medicine_reminder_emailed(
  p_patient_id uuid,
  p_local_date date,
  p_dose_time text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.medicine_reminders
  set emailed_at = now()
  where patient_id = p_patient_id
    and local_date = p_local_date
    and dose_time = p_dose_time
    and emailed_at is null;
$$;

revoke execute on function public.mark_medicine_reminder_emailed(uuid, date, text) from public, anon, authenticated;
grant execute on function public.mark_medicine_reminder_emailed(uuid, date, text) to service_role;

-- Starting it ------------------------------------------------------------------
-- Uses the same Vault secrets as appointment reminders. A database without them
-- makes no requests.

create or replace function private.request_medicine_reminders()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_site_url text;
  v_secret text;
begin
  select decrypted_secret into v_site_url
  from vault.decrypted_secrets where name = 'reminders_site_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'reminders_cron_secret';

  if v_site_url is null or v_secret is null then
    return;
  end if;

  -- pg_net's default timeout is far too short for sending email.
  perform net.http_get(
    url := rtrim(v_site_url, '/') || '/api/cron/medicine-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke execute on function private.request_medicine_reminders() from public;

-- Scheduling the same name again replaces the job.
select cron.schedule(
  'medicine-reminders',
  '*/15 * * * *',
  'select private.request_medicine_reminders()'
);
