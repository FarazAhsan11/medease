-- PRO-05, NTF-07: which updates reach someone by email.
--
-- Every update still rings the bell in the app; these settings only choose the
-- emails. Account, security and booking emails can't be turned off, so they have
-- no category here. Quiet hours wait for the outbox (NTF-05): without one an email
-- that falls inside them could only be dropped, not held.
--
-- Run this before the app that reads it goes live: the settings pages read
-- notification_preferences, and the app checks email_wanted before sending.
--
-- Safe to run more than once.

-- Settings ---------------------------------------------------------------------
-- No row means the email is on. A row exists only once someone has saved.

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null
    check (category in ('appointment_reminders', 'prescriptions', 'doctor_bookings')),
  channel text not null check (channel in ('email')),
  enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category, channel)
);

drop trigger if exists set_updated_at on public.notification_preferences;
create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated, service_role;
grant select on public.notification_preferences to authenticated;

drop policy if exists "Users read their notification settings" on public.notification_preferences;
create policy "Users read their notification settings" on public.notification_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Not clinical, but a password alone shouldn't be able to silence a doctor's
-- booking emails, so saving follows the same two-factor rule as everything else.
drop trigger if exists require_second_factor on public.notification_preferences;
create trigger require_second_factor
  before insert or update or delete on public.notification_preferences
  for each statement execute function private.require_second_factor();

-- What each role can choose. Keep in step with emailCategories in
-- src/features/notifications/lib/notification-preferences.ts.
create or replace function private.notification_categories(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'patient' then array['appointment_reminders', 'prescriptions']
    when 'doctor' then array['doctor_bookings']
    else array[]::text[]
  end;
$$;

revoke execute on function private.notification_categories(text) from public;

-- Saving -----------------------------------------------------------------------
-- p_enabled lists the categories that stay on for the channel; every other
-- category the caller's role has is turned off.

create or replace function public.save_notification_preferences(
  p_channel text,
  p_enabled text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_categories text[] := private.notification_categories(
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
  );
begin
  if v_uid is null or cardinality(v_categories) = 0 then
    raise exception 'no_notification_settings';
  end if;

  if p_channel is distinct from 'email' then
    raise exception 'invalid_channel';
  end if;

  if p_enabled is null or not (p_enabled <@ v_categories) then
    raise exception 'invalid_category';
  end if;

  insert into public.notification_preferences (user_id, category, channel, enabled)
  select v_uid, category, p_channel, category = any (p_enabled)
  from unnest(v_categories) as category
  on conflict (user_id, category, channel) do update set
    enabled = excluded.enabled;
end;
$$;

revoke execute on function public.save_notification_preferences(text, text[]) from public, anon;
grant execute on function public.save_notification_preferences(text, text[]) to authenticated;

-- Checking ---------------------------------------------------------------------

create or replace function private.wants_email(p_user_id uuid, p_category text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select p.enabled
      from public.notification_preferences p
      where p.user_id = p_user_id
        and p.category = p_category
        and p.channel = 'email'
    ),
    true
  );
$$;

revoke execute on function private.wants_email(uuid, text) from public;

-- The app asks this after an action, before emailing the other person in it
-- (a doctor when a patient books, a patient when a prescription is issued). The
-- secret key can't read the table, so this is its only view of it.
create or replace function public.email_wanted(p_user_id uuid, p_category text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.wants_email(p_user_id, p_category);
$$;

revoke execute on function public.email_wanted(uuid, text) from public, anon, authenticated;
grant execute on function public.email_wanted(uuid, text) to service_role;

-- Appointment reminders ----------------------------------------------------------
-- As in 20261102090000_reminder_schedule.sql, except that a patient who turned
-- reminder emails off still gets the bell but no email. Their row is marked
-- email_skipped, so the retry below never picks it up. It needs its own flag:
-- that migration reads attempts = 0 with no emailed_at as "sent before the
-- upgrade" when it's run again.

alter table public.appointment_reminders
  add column if not exists email_skipped boolean not null default false;

-- Rows skipped by the first version of this migration, which used attempts = 0.
-- Rows from before the upgrade all have emailed_at, so they can't match.
update public.appointment_reminders
set email_skipped = true, attempts = 1
where emailed_at is null and attempts = 0;

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
  v_email boolean;
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
    v_email := private.wants_email(v_due.patient_id, 'appointment_reminders');

    insert into public.appointment_reminders (
      appointment_id, kind, attempts, last_attempt_at, email_skipped
    ) values (
      v_due.id,
      v_due.due_kind,
      1,
      case when v_email then now() end,
      not v_email
    )
    on conflict do nothing;

    if found then
      perform private.notify(v_due.patient_id, 'appointment_reminder', '/patient/appointments');

      if v_email then
        appointment_id := v_due.id;
        kind := v_due.due_kind;
        patient_name := v_due.patient_name;
        patient_email := v_due.patient_email;
        starts_at := v_due.starts_at;
        timezone := v_due.timezone;
        return next;
      end if;
    end if;
  end loop;

  return query
  update public.appointment_reminders r
  set attempts = r.attempts + 1, last_attempt_at = now()
  from public.appointments a
  where a.id = r.appointment_id
    and r.emailed_at is null
    and not r.email_skipped
    and r.attempts < 3
    and r.last_attempt_at <= now() - interval '10 minutes'
    and a.status = 'booked'
    and a.starts_at > now()
    and (r.kind = '1h' or a.starts_at > now() + interval '1 hour')
    and private.wants_email(a.patient_id, 'appointment_reminders')
  returning r.appointment_id, r.kind, a.patient_name, a.patient_email, a.starts_at, a.timezone;

  -- Section 6.2: notifications and the send log are kept 90 days.
  delete from public.notifications where created_at < now() - interval '90 days';
  delete from public.appointment_reminders where sent_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.claim_appointment_reminders() from public, anon, authenticated;
grant execute on function public.claim_appointment_reminders() to service_role;
