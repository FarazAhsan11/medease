-- Consent records (AUTH-03, CMPL-02, PRV-02) --------------------------------------
-- One row each time someone accepts a version of a legal document. Rows are kept
-- when a version changes or consent is withdrawn, so the history stays readable.
-- The versions themselves live with the documents in src/features/legal/data.

create table if not exists public.user_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document text not null check (
    document in ('terms', 'privacy', 'telemedicine-consent', 'partner-terms')
  ),
  version text not null check (version ~ '^[0-9]+\.[0-9]+$'),
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create unique index if not exists user_consents_active_idx
  on public.user_consents (user_id, document, version)
  where withdrawn_at is null;

create index if not exists user_consents_user_idx
  on public.user_consents (user_id, id desc);

alter table public.user_consents enable row level security;

revoke all on table public.user_consents from public, anon, authenticated;
grant select on table public.user_consents to authenticated;

drop policy if exists "People read their own consents" on public.user_consents;
create policy "People read their own consents" on public.user_consents
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Written directly because sign-up has no session for private.write_audit to read.

create or replace function private.audit_consent(
  p_user_id uuid,
  p_action text,
  p_details jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id, details)
  select
    u.id,
    u.raw_app_meta_data ->> 'role',
    p_action,
    'user',
    u.id,
    p_details
  from auth.users u
  where u.id = p_user_id;
$$;

revoke execute on function private.audit_consent(uuid, text, jsonb) from public;

create or replace function private.save_consents(p_user_id uuid, p_consents jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document text;
  v_version text;
begin
  if jsonb_typeof(p_consents) is distinct from 'array'
    or p_consents = '[]'::jsonb then
    raise exception 'invalid_consent';
  end if;

  for v_document, v_version in
    select item ->> 'document', item ->> 'version'
    from jsonb_array_elements(p_consents) as item
  loop
    begin
      insert into public.user_consents (user_id, document, version)
      values (p_user_id, v_document, v_version)
      on conflict (user_id, document, version) where withdrawn_at is null do nothing;
    exception
      when check_violation or not_null_violation then
        raise exception 'invalid_consent';
    end;

    if found then
      perform private.audit_consent(
        p_user_id,
        'consent.accepted',
        jsonb_build_object('document', v_document, 'version', v_version)
      );
    end if;
  end loop;
end;
$$;

revoke execute on function private.save_consents(uuid, jsonb) from public;

-- The signed-in person accepting for themselves.

create or replace function public.accept_consents(p_consents jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.save_consents(auth.uid(), p_consents);
end;
$$;

revoke execute on function public.accept_consents(jsonb) from public, anon;
grant execute on function public.accept_consents(jsonb) to authenticated;

-- Sign-up runs before there is a session, so the server names the new account.

create or replace function public.record_consents(p_user_id uuid, p_consents jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.save_consents(p_user_id, p_consents);
end;
$$;

revoke execute on function public.record_consents(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_consents(uuid, jsonb) to service_role;

-- Only the telemedicine consent can be withdrawn on its own. Leaving the Terms or
-- the Privacy Policy means closing the account (AUTH-07). A booked visit has to be
-- cancelled first, so nobody ends up with a consultation they no longer consent to.

create or replace function public.withdraw_consent(p_document text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if p_document is distinct from 'telemedicine-consent' then
    raise exception 'not_withdrawable';
  end if;

  update public.user_consents
  set withdrawn_at = now()
  where user_id = v_user_id
    and document = p_document
    and withdrawn_at is null;

  if not found then
    raise exception 'not_consented';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.patient_id = v_user_id
      and a.status = 'booked'
      and a.ends_at > now()
  ) then
    raise exception 'upcoming_appointments';
  end if;

  perform private.audit_consent(
    v_user_id,
    'consent.withdrawn',
    jsonb_build_object('document', p_document)
  );
end;
$$;

revoke execute on function public.withdraw_consent(text) from public, anon;
grant execute on function public.withdraw_consent(text) to authenticated;

-- No consultation without the consent, however the booking arrives.

create or replace function private.require_telemedicine_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.user_consents c
    where c.user_id = new.patient_id
      and c.document = 'telemedicine-consent'
      and c.withdrawn_at is null
  ) then
    raise exception 'consent_required';
  end if;

  return new;
end;
$$;

revoke execute on function private.require_telemedicine_consent() from public;

drop trigger if exists require_telemedicine_consent on public.appointments;
create trigger require_telemedicine_consent
  before insert on public.appointments
  for each row execute function private.require_telemedicine_consent();
