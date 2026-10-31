-- MedEase: two-factor for doctors, labs and patients who turn it on, recovery
-- codes, rate limits and the security audit trail (AUTH-06, AUTH-07, SEC-03,
-- SEC-04, SEC-05). Safe to run more than once. Run after the care recipients
-- migration.
--
-- Doctors, labs and admins must hold an aal2 session to reach clinical data.
-- Patients choose; once they have a verified factor the same rule applies to
-- them. The app redirects to the two-factor page, but that's only the friendly
-- half: a stolen password calling the API directly is stopped here.

-- Medical lists ignore case when dropping repeats ------------------------------
-- "Penicillin" and "penicillin" are one allergy. The first spelling is kept.

create or replace function private.clean_list(p_items text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(item order by first_seen), '{}')
  from (
    select distinct on (lower(trim(value)))
      trim(value) as item,
      ord as first_seen
    from unnest(p_items) with ordinality as list(value, ord)
    where nullif(trim(value), '') is not null
    order by lower(trim(value)), ord
  ) cleaned;
$$;

revoke execute on function private.clean_list(text[]) from public;

-- Who has passed a second factor ---------------------------------------------

create or replace function private.second_factor_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    or (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
        not in ('doctor', 'lab', 'admin')
      and not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      )
    );
$$;

revoke execute on function private.second_factor_ok() from public;
grant execute on function private.second_factor_ok() to authenticated, service_role;

-- Reads: a restrictive policy applies on top of every other policy, so a future
-- policy that forgets this rule still can't open the table up.

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'appointments', 'appointment_notes', 'prescriptions', 'prescription_items',
    'care_recipients', 'patient_profiles'
  ]
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
  end loop;
end;
$$;

-- Writes: SECURITY DEFINER functions skip RLS, so these triggers cover them, and
-- any function added later, in one place. Server jobs have no signed-in user and
-- are unaffected.

create or replace function private.require_second_factor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not private.second_factor_ok() then
    raise exception 'second_factor_required';
  end if;
  return null;
end;
$$;

revoke execute on function private.require_second_factor() from public;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'appointments', 'appointment_notes', 'prescriptions', 'prescription_items',
    'care_recipients', 'patient_profiles', 'doctor_availability'
  ]
  loop
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

-- Calls: realtime signaling doesn't touch those tables, so check here too. Same
-- function as before plus the rule.

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

  if not private.second_factor_ok() then
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
      and now() < public.call_closes_at(a.starts_at, a.ends_at)
  );
end;
$$;

revoke execute on function public.can_join_call(text) from public, anon;
grant execute on function public.can_join_call(text) to authenticated;

-- Security events in the audit log (SEC-04) ----------------------------------------
-- The server calls this with the secret key, so the session has no user of its
-- own and the actor is passed in. Ids and a hashed IP only.

create or replace function public.record_security_event(
  p_actor_id uuid,
  p_action text,
  p_ip_hash text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_action is null or p_action not in (
    'auth.signed_in', 'auth.password_changed', 'mfa.enrolled', 'mfa.disabled'
  ) then
    raise exception 'invalid_event';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id, details)
  select
    u.id,
    u.raw_app_meta_data ->> 'role',
    p_action,
    'user',
    u.id,
    case when p_ip_hash is null then '{}'::jsonb
      else jsonb_build_object('ip_hash', p_ip_hash) end
  from auth.users u
  where u.id = p_actor_id;
end;
$$;

revoke execute on function public.record_security_event(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_security_event(uuid, text, text) to service_role;

-- Every prescription change, whichever function made it.

create or replace function private.audit_prescription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit(
      case when new.replaces_id is null then 'prescription.issued' else 'prescription.replaced' end,
      'prescription',
      new.id
    );
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    perform private.write_audit('prescription.cancelled', 'prescription', new.id);
  end if;
  return null;
end;
$$;

revoke execute on function private.audit_prescription() from public;

drop trigger if exists audit_prescription on public.prescriptions;
create trigger audit_prescription
  after insert or update of status on public.prescriptions
  for each row execute function private.audit_prescription();

-- Recovery codes (AUTH-06) -----------------------------------------------------------
-- Supabase has none, so they're ours: only hashes are stored, each works once, and
-- only the server (secret key) can reach the table. Using one removes the lost
-- factor, so the person sets up a new app and gets new codes.

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, code_hash)
);

alter table public.mfa_recovery_codes enable row level security;
revoke all on public.mfa_recovery_codes from anon, authenticated;
grant all on public.mfa_recovery_codes to service_role;
-- No policies on purpose: only the server touches this table.

create or replace function public.replace_recovery_codes(
  p_user_id uuid,
  p_code_hashes text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_code_hashes is null or cardinality(p_code_hashes) not between 1 and 20 then
    raise exception 'invalid_recovery_codes';
  end if;

  delete from public.mfa_recovery_codes where user_id = p_user_id;

  insert into public.mfa_recovery_codes (user_id, code_hash)
  select p_user_id, hash from unnest(p_code_hashes) as hash;

  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id)
  select u.id, u.raw_app_meta_data ->> 'role', 'mfa.recovery_codes_created', 'user', u.id
  from auth.users u
  where u.id = p_user_id;
end;
$$;

revoke execute on function public.replace_recovery_codes(uuid, text[]) from public, anon, authenticated;
grant execute on function public.replace_recovery_codes(uuid, text[]) to service_role;

create or replace function public.use_recovery_code(
  p_user_id uuid,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.mfa_recovery_codes
  set used_at = now()
  where user_id = p_user_id and code_hash = p_code_hash and used_at is null;

  if not found then
    return false;
  end if;

  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id)
  select u.id, u.raw_app_meta_data ->> 'role', 'mfa.recovery_code_used', 'user', u.id
  from auth.users u
  where u.id = p_user_id;

  return true;
end;
$$;

revoke execute on function public.use_recovery_code(uuid, text) from public, anon, authenticated;
grant execute on function public.use_recovery_code(uuid, text) to service_role;

-- Rate limits (AUTH-07, SEC-05) --------------------------------------------------------
-- Serverless instances share nothing, so the count has to live here. Buckets are
-- hashed by the app and never hold an email or an IP. Fixed windows: simple, and
-- at worst a burst straddles two windows.

create table if not exists public.rate_limits (
  bucket text not null check (char_length(bucket) <= 120),
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated, service_role;

-- True while the caller is within the limit. Counting happens in one statement,
-- so concurrent requests can't slip past each other.
create or replace function public.hit_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket, window_start)
  values (p_bucket, v_window)
  on conflict (bucket, window_start)
  do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  -- Old windows are never read again; sweep now and then so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
