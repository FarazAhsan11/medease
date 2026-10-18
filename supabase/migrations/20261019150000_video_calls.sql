-- MedEase: video calls for appointments. Safe to run more than once.
--
-- Video and audio go straight between the two browsers (WebRTC). Supabase
-- Realtime only relays the short setup messages, on a private channel named
-- "call:<appointment id>". The policies below let only that appointment's
-- patient and doctor join, and only from 5 minutes before the start until 30
-- minutes after it (keep in sync with CALL_WINDOW in the app).
--
-- Also turn off "Allow public access" in Dashboard > Realtime > Settings so
-- every channel has to pass these policies.

alter table public.appointments
  add column if not exists call_started_at timestamptz,
  add column if not exists call_ended_at timestamptz;

-- Who may be in a call right now. Takes the channel topic so the policies can
-- pass realtime.topic() straight in; malformed topics are simply refused.
create or replace function public.can_join_call(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
begin
  if p_topic is null
    or p_topic !~ '^call:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  v_appointment_id := substring(p_topic from 6)::uuid;

  return exists (
    select 1
    from public.appointments a
    where a.id = v_appointment_id
      and (select auth.uid()) in (a.patient_id, a.doctor_id)
      and a.status = 'booked'
      and now() >= a.starts_at - interval '5 minutes'
      and now() < a.starts_at + interval '30 minutes'
  );
end;
$$;

revoke execute on function public.can_join_call(text) from public, anon;
grant execute on function public.can_join_call(text) to authenticated;

-- Realtime checks these when someone joins a private channel (and caches the
-- answer for that connection). RLS is already enabled on realtime.messages.
drop policy if exists "Call participants receive call signals" on realtime.messages;
create policy "Call participants receive call signals" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.can_join_call((select realtime.topic()))
  );

drop policy if exists "Call participants send call signals" on realtime.messages;
create policy "Call participants send call signals" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.can_join_call((select realtime.topic()))
  );

-- Records when a call actually connected and ended, for the doctor's view.
create or replace function public.record_call_event(
  p_appointment_id uuid,
  p_event text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event not in ('started', 'ended') then
    raise exception 'invalid_event';
  end if;

  if p_event = 'started' and not public.can_join_call('call:' || p_appointment_id::text) then
    raise exception 'call_not_open';
  end if;

  -- Ending is allowed a few minutes past the window, since the automatic
  -- hang-up happens right at the limit.
  if p_event = 'ended' and not exists (
    select 1 from public.appointments a
    where a.id = p_appointment_id
      and (select auth.uid()) in (a.patient_id, a.doctor_id)
      and now() < a.starts_at + interval '40 minutes'
  ) then
    raise exception 'call_not_open';
  end if;

  if p_event = 'started' then
    update public.appointments
    set call_started_at = coalesce(call_started_at, now())
    where id = p_appointment_id;
  else
    update public.appointments
    set call_ended_at = now()
    where id = p_appointment_id and call_started_at is not null;
  end if;
end;
$$;

revoke execute on function public.record_call_event(uuid, text) from public, anon;
grant execute on function public.record_call_event(uuid, text) to authenticated;
