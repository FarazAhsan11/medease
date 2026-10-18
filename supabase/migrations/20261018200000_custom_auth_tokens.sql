-- MedEase: our own email confirmation and password reset tokens, so auth
-- emails are sent by the app (Nodemailer) instead of Supabase. Safe to run
-- more than once.
--
-- Only hashes are stored; the raw token exists only in the emailed link.
-- Nothing here is reachable with the publishable key: the server uses the
-- secret key for every read and write.

create table if not exists public.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('email_confirmation', 'password_reset')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Rate limiting looks up a user's recent tokens for one purpose.
create index if not exists auth_tokens_user_purpose_created_idx
  on public.auth_tokens (user_id, purpose, created_at desc);

alter table public.auth_tokens enable row level security;
revoke all on public.auth_tokens from anon, authenticated;
grant all on public.auth_tokens to service_role;
-- No policies on purpose: only the server (secret key) touches this table.

-- Finds an account by email for "forgot password" and "resend confirmation".
-- auth.users isn't exposed through the API, so this runs as the owner and is
-- callable only with the secret key.
create or replace function public.find_auth_user_by_email(user_email text)
returns table (
  id uuid,
  email text,
  email_confirmed_at timestamptz,
  full_name text,
  role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.email::text,
    u.email_confirmed_at,
    u.raw_user_meta_data ->> 'full_name',
    u.raw_app_meta_data ->> 'role'
  from auth.users u
  where lower(u.email) = lower(user_email)
  limit 1;
$$;

revoke execute on function public.find_auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.find_auth_user_by_email(text) to service_role;
