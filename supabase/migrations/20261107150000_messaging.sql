-- MSG-01 to MSG-04: doctor–patient messaging. Design: docs/chat.md.
--
-- One conversation per doctor and patient (the account holder), open while they
-- have an appointment that wasn't cancelled. A patient can write until 7 days
-- after the end of their latest visit; the doctor can extend or close that, and a
-- new booking reopens it. Doctors can always write to their patients.
--
-- Live delivery: Broadcast on one private channel per person, "user:<id>".
-- send_message and mark_conversation_read announce each change to the two people
-- in the conversation themselves. Realtime checks the channel policy once, when
-- someone joins, rather than checking every change against every subscriber as
-- Postgres Changes does, which is Supabase's advice for anything that has to scale.
--
-- Safe to run more than once.

-- Tables -----------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  -- Set by the doctor (extend or close); null means 7 days after the latest visit.
  patient_window_ends_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (doctor_id, patient_id)
);

-- When the doctor last extended or closed it: a visit that ends after this
-- brings back the usual 7 days.
alter table public.conversations
  add column if not exists patient_window_set_at timestamptz;

create index if not exists conversations_patient_idx on public.conversations (patient_id);

-- sender_id and recipient_id are copied from the conversation by send_message, so
-- the read policy needs no join, which Realtime runs for every change.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_recipient_unread_idx
  on public.messages (recipient_id) where read_at is null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations from public, anon, authenticated, service_role;
revoke all on public.messages from public, anon, authenticated, service_role;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;

drop policy if exists "Participants read their conversations" on public.conversations;
create policy "Participants read their conversations" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (doctor_id, patient_id));

drop policy if exists "Participants read their messages" on public.messages;
create policy "Participants read their messages" on public.messages
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

do $$
declare
  v_table text;
begin
  foreach v_table in array array['conversations', 'messages']
  loop
    execute format('drop policy if exists "Clinical data needs a second factor" on public.%I', v_table);
    execute format(
      'create policy "Clinical data needs a second factor" on public.%I
         as restrictive
         for all to authenticated
         using ((select private.second_factor_ok()))
         with check ((select private.second_factor_ok()))',
      v_table
    );
    execute format('drop trigger if exists require_second_factor on public.%I', v_table);
    execute format(
      'create trigger require_second_factor
         before insert or update or delete on public.%I
         for each statement execute function private.require_second_factor()',
      v_table
    );
  end loop;
end;
$$;

-- Postgres Changes isn't used for messages (an earlier draft of this file added
-- the table to the publication).
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime drop table public.messages;
  end if;
end;
$$;

-- MSG-02: each person may listen on their own channel only, and doctors only
-- after their second factor, like the tables. Nobody may send on it; only the
-- functions below do, through realtime.send.
drop policy if exists "People receive their own live updates" on realtime.messages;
create policy "People receive their own live updates" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'user:' || (select auth.uid())::text
    and (select private.second_factor_ok())
  );

-- Tells the given people about a change on their channels. A failed send must
-- never undo the message itself, and realtime.send only warns on failure.
create or replace function private.announce(
  p_user_ids uuid[],
  p_event text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  foreach v_user_id in array p_user_ids
  loop
    perform realtime.send(p_payload, p_event, 'user:' || v_user_id::text, true);
  end loop;
end;
$$;

revoke execute on function private.announce(uuid[], text, jsonb) from public;

-- Rules ------------------------------------------------------------------------

-- MSG-01: the pair has an appointment that wasn't cancelled.
create or replace function private.has_care_link(p_doctor_id uuid, p_patient_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.appointments a
    where a.doctor_id = p_doctor_id
      and a.patient_id = p_patient_id
      and a.status <> 'cancelled'
  );
$$;

revoke execute on function private.has_care_link(uuid, uuid) from public;

-- MSG-04: when the patient can no longer write. Keep in step with
-- MESSAGE_WINDOW_DAYS in src/features/messaging/lib/messaging.ts.
-- 7 days after the latest visit, unless the doctor set the end. Their choice
-- holds until a visit ends after they made it: then the later of the two, so a
-- visit booked before the doctor closed it still opens the window once it
-- happens, and an extension isn't cut short.
drop function if exists private.patient_window_ends_at(uuid, uuid, timestamptz);
create or replace function private.patient_window_ends_at(
  p_doctor_id uuid,
  p_patient_id uuid,
  p_override timestamptz,
  p_set_at timestamptz
)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  with visits as (
    select
      max(a.ends_at) + interval '7 days' as usual_end,
      bool_or(a.ends_at > p_set_at and a.ends_at <= now()) as visit_since
    from public.appointments a
    where a.doctor_id = p_doctor_id
      and a.patient_id = p_patient_id
      and a.status <> 'cancelled'
  )
  select case
    when p_override is null then v.usual_end
    when coalesce(v.visit_since, false) then greatest(p_override, v.usual_end)
    else p_override
  end
  from visits v;
$$;

revoke execute on function private.patient_window_ends_at(uuid, uuid, timestamptz, timestamptz) from public;

-- A new booking reopens a window the doctor closed or set earlier than the new
-- visit's own 7 days.
create or replace function private.reopen_message_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set patient_window_ends_at = null, patient_window_set_at = null
  where doctor_id = new.doctor_id
    and patient_id = new.patient_id
    and patient_window_ends_at < new.ends_at + interval '7 days';
  return null;
end;
$$;

revoke execute on function private.reopen_message_window() from public;

drop trigger if exists reopen_message_window on public.appointments;
create trigger reopen_message_window
  after insert on public.appointments
  for each row execute function private.reopen_message_window();

-- Functions --------------------------------------------------------------------

-- Finds or starts the caller's conversation with a doctor (for a patient) or a
-- patient (for a doctor).
create or replace function public.open_conversation(p_other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_doctor_id uuid;
  v_patient_id uuid;
  v_id uuid;
begin
  if v_uid is null or v_role not in ('patient', 'doctor') then
    raise exception 'not_allowed';
  end if;

  if v_role = 'patient' then
    v_doctor_id := p_other_id;
    v_patient_id := v_uid;
  else
    v_doctor_id := v_uid;
    v_patient_id := p_other_id;
  end if;

  if not private.has_care_link(v_doctor_id, v_patient_id) then
    raise exception 'no_appointment';
  end if;

  insert into public.conversations (doctor_id, patient_id)
  values (v_doctor_id, v_patient_id)
  on conflict (doctor_id, patient_id) do nothing
  returning id into v_id;

  if v_id is null then
    select c.id into v_id
    from public.conversations c
    where c.doctor_id = v_doctor_id and c.patient_id = v_patient_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.open_conversation(uuid) from public, anon;
grant execute on function public.open_conversation(uuid) to authenticated;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_conversation public.conversations;
  v_body text := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');
  v_id uuid;
  v_created_at timestamptz;
begin
  select * into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
    and v_uid in (c.doctor_id, c.patient_id);

  if not found then
    raise exception 'not_participant';
  end if;

  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_message';
  end if;

  if not private.has_care_link(v_conversation.doctor_id, v_conversation.patient_id) then
    raise exception 'no_appointment';
  end if;

  if v_uid = v_conversation.patient_id
    and now() >= private.patient_window_ends_at(
      v_conversation.doctor_id,
      v_conversation.patient_id,
      v_conversation.patient_window_ends_at,
      v_conversation.patient_window_set_at
    ) then
    raise exception 'window_closed';
  end if;

  insert into public.messages (conversation_id, sender_id, recipient_id, body)
  values (
    v_conversation.id,
    v_uid,
    case when v_uid = v_conversation.doctor_id
      then v_conversation.patient_id
      else v_conversation.doctor_id
    end,
    v_body
  )
  returning messages.id, messages.created_at into v_id, v_created_at;

  update public.conversations c
  set last_message_at = v_created_at
  where c.id = v_conversation.id;

  perform private.announce(
    array[v_conversation.doctor_id, v_conversation.patient_id],
    'message',
    (
      select jsonb_build_object(
        'id', m.id,
        'conversation_id', m.conversation_id,
        'sender_id', m.sender_id,
        'recipient_id', m.recipient_id,
        'body', m.body,
        'created_at', m.created_at,
        'read_at', m.read_at
      )
      from public.messages m
      where m.id = v_id
    )
  );

  id := v_id;
  created_at := v_created_at;
  return next;
end;
$$;

revoke execute on function public.send_message(uuid, text) from public, anon;
grant execute on function public.send_message(uuid, text) to authenticated;

-- Marks the other person's messages to the caller as read. Returns how many.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_sender_id uuid;
begin
  update public.messages m
  set read_at = now()
  where m.conversation_id = p_conversation_id
    and m.recipient_id = v_uid
    and m.read_at is null;

  get diagnostics v_count = row_count;

  -- One receipt for the batch: the reader's badge and list drop by v_count,
  -- and the sender sees "Seen".
  if v_count > 0 then
    select case when c.doctor_id = v_uid then c.patient_id else c.doctor_id end
    into v_sender_id
    from public.conversations c
    where c.id = p_conversation_id;

    perform private.announce(
      array[v_uid, v_sender_id],
      'read',
      jsonb_build_object(
        'conversation_id', p_conversation_id,
        'reader_id', v_uid,
        'read_at', now(),
        'count', v_count
      )
    );
  end if;

  return v_count;
end;
$$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- MSG-04: the doctor gives the patient 7 more days from now or from the current
-- end, whichever is later, or closes the window now. Returns the new end.
create or replace function public.set_message_window(
  p_conversation_id uuid,
  p_action text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
  v_ends_at timestamptz;
begin
  if p_action is null or p_action not in ('extend', 'close') then
    raise exception 'invalid_action';
  end if;

  select * into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
    and c.doctor_id = auth.uid();

  if not found then
    raise exception 'not_doctor';
  end if;

  v_ends_at := case p_action
    when 'close' then now()
    else greatest(
      now(),
      coalesce(
        private.patient_window_ends_at(
          v_conversation.doctor_id,
          v_conversation.patient_id,
          v_conversation.patient_window_ends_at,
          v_conversation.patient_window_set_at
        ),
        now()
      )
    ) + interval '7 days'
  end;

  update public.conversations c
  set patient_window_ends_at = v_ends_at, patient_window_set_at = now()
  where c.id = v_conversation.id;

  return v_ends_at;
end;
$$;

revoke execute on function public.set_message_window(uuid, text) from public, anon;
grant execute on function public.set_message_window(uuid, text) to authenticated;

-- The caller's conversations, newest first, with the other person's name, the
-- last message and the unread count: the newest p_limit of them, or one with
-- p_conversation_id. It reads the other person's profile, which the caller's
-- policies don't allow, so it applies the two-factor rule itself.
drop function if exists public.get_conversations(uuid);
create or replace function public.get_conversations(
  p_conversation_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  doctor_id uuid,
  patient_id uuid,
  other_name text,
  last_message_at timestamptz,
  last_body text,
  last_sender_id uuid,
  unread integer,
  patient_window_ends_at timestamptz,
  can_write boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  if not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;

  return query
  select
    c.id,
    c.doctor_id,
    c.patient_id,
    case when v_uid = c.doctor_id
      then nullif(btrim(concat_ws(' ', pp.first_name, pp.last_name)), '')
      else nullif(btrim(concat_ws(' ', dp.first_name, dp.last_name)), '')
    end,
    c.last_message_at,
    last.body,
    last.sender_id,
    (
      select count(*)::integer from public.messages m
      where m.conversation_id = c.id
        and m.recipient_id = v_uid
        and m.read_at is null
    ),
    w.ends_at,
    private.has_care_link(c.doctor_id, c.patient_id)
      and (v_uid = c.doctor_id or now() < coalesce(w.ends_at, '-infinity'))
  from public.conversations c
  join public.doctor_profiles dp on dp.id = c.doctor_id
  left join public.patient_profiles pp on pp.id = c.patient_id
  cross join lateral (
    select private.patient_window_ends_at(
      c.doctor_id, c.patient_id, c.patient_window_ends_at, c.patient_window_set_at
    ) as ends_at
  ) w
  left join lateral (
    select m.body, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) last on true
  where v_uid in (c.doctor_id, c.patient_id)
    and (p_conversation_id is null or c.id = p_conversation_id)
  order by coalesce(c.last_message_at, c.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

revoke execute on function public.get_conversations(uuid, integer) from public, anon;
grant execute on function public.get_conversations(uuid, integer) to authenticated;
