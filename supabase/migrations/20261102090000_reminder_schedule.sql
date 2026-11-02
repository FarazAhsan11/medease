-- REL-07: reminders start from the database, and a failed email is sent again.
-- Design: docs/roadmap.md, "Reminder scheduler".
--
-- Before running this:
-- 1. The app that marks sent emails must be live. The older route never marks
--    them, so each reminder would go out three times.
-- 2. pg_cron and pg_net must be on (Database > Extensions). They're not created
--    here because the SQL tests run on PGlite, which has neither.
-- 3. The Vault secrets belong in the SQL Editor, never in this file: the repo is
--    public. A database without them makes no requests.
--
-- Safe to run more than once.

alter table public.appointment_reminders
  add column if not exists emailed_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists attempts integer not null default 0;

-- Rows from before this migration count as sent. Every later row starts with
-- attempts = 1, so running this again can't mark a failed email as sent.
update public.appointment_reminders
set emailed_at = sent_at
where emailed_at is null and attempts = 0;

-- The first claim of a reminder rings the bell. Later runs only return it again
-- until its email is marked as sent: no second notice, 3 tries at most, 10 minutes
-- apart. The update takes each row's lock, so overlapping runs can't both send one.
-- A 24-hour reminder stops inside the last hour: it says "tomorrow", and the 1-hour
-- one has taken over.
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
    insert into public.appointment_reminders (appointment_id, kind, attempts, last_attempt_at)
    values (v_due.id, v_due.due_kind, 1, now())
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

  return query
  update public.appointment_reminders r
  set attempts = r.attempts + 1, last_attempt_at = now()
  from public.appointments a
  where a.id = r.appointment_id
    and r.emailed_at is null
    and r.attempts < 3
    and r.last_attempt_at <= now() - interval '10 minutes'
    and a.status = 'booked'
    and a.starts_at > now()
    and (r.kind = '1h' or a.starts_at > now() + interval '1 hour')
  returning r.appointment_id, r.kind, a.patient_name, a.patient_email, a.starts_at, a.timezone;

  -- Section 6.2: notifications and the send log are kept 90 days.
  delete from public.notifications where created_at < now() - interval '90 days';
  delete from public.appointment_reminders where sent_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.claim_appointment_reminders() from public, anon, authenticated;
grant execute on function public.claim_appointment_reminders() to service_role;

create or replace function public.mark_appointment_reminder_emailed(
  p_appointment_id uuid,
  p_kind text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.appointment_reminders
  set emailed_at = now()
  where appointment_id = p_appointment_id
    and kind = p_kind
    and emailed_at is null;
$$;

revoke execute on function public.mark_appointment_reminder_emailed(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_appointment_reminder_emailed(uuid, text) to service_role;

create or replace function private.request_appointment_reminders()
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

  -- A database without these secrets, such as staging, sends nothing.
  if v_site_url is null or v_secret is null then
    return;
  end if;

  -- pg_net's default timeout is far too short for sending email.
  perform net.http_get(
    url := rtrim(v_site_url, '/') || '/api/cron/appointment-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke execute on function private.request_appointment_reminders() from public;

-- Scheduling the same name again replaces the job.
select cron.schedule(
  'appointment-reminders',
  '*/15 * * * *',
  'select private.request_appointment_reminders()'
);
