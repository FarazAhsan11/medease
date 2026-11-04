// A throwaway Postgres for testing the migrations: real Postgres compiled to
// WebAssembly (PGlite), in memory, with no Docker, no network and no Supabase
// project. Each run starts empty and vanishes when it ends.
//
// PGlite is plain Postgres, so the small part of Supabase the migrations lean
// on is stubbed below: the three API roles, auth.users, auth.uid(), auth.jwt(),
// and the storage and realtime tables. The stubs read the same request.jwt.claims
// setting Supabase's API sets, so a test acts as a real signed-in user would and
// RLS, grants and every SECURITY DEFINER check apply exactly as in production.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const MIGRATIONS = "supabase/migrations";

const SUPABASE_STUBS = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create publication supabase_realtime;

  create schema auth;
  create schema storage;
  create schema realtime;
  create schema extensions;
  grant usage on schema public, extensions to anon, authenticated, service_role;
  grant usage on schema auth, storage, realtime to anon, authenticated, service_role;

  -- Supabase's default privileges: new tables, views and functions in public
  -- reach the API roles, which is why every migration revokes what it doesn't
  -- want exposed. Without this the tests would pass for the wrong reason.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255),
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb not null default '{}',
    raw_user_meta_data jsonb not null default '{}',
    created_at timestamptz not null default now()
  );

  create table auth.mfa_factors (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    status text not null
  );

  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  $$;

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(auth.jwt() ->> 'sub', '')::uuid;
  $$;

  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );

  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    metadata jsonb
  );
  alter table storage.objects enable row level security;
  grant select on storage.objects to authenticated;

  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1 : cardinality(string_to_array(name, '/')) - 1];
  $$;

  create table realtime.messages (
    id uuid primary key default gen_random_uuid(),
    topic text,
    extension text,
    payload jsonb
  );
  alter table realtime.messages enable row level security;
  grant select, insert on realtime.messages to authenticated;

  create function realtime.topic() returns text language sql stable as $$
    select nullif(current_setting('realtime.topic', true), '');
  $$;
  grant execute on function realtime.topic() to authenticated;

  -- pg_cron, pg_net and Vault aren't in PGlite. These stand-ins record what
  -- they're asked to do, so a test can read it back.
  create schema cron;
  create table cron.job (
    jobname text primary key,
    schedule text not null,
    command text not null
  );
  create function cron.schedule(job_name text, schedule text, command text)
  returns bigint language sql as $$
    insert into cron.job values (job_name, schedule, command)
    on conflict (jobname) do update
      set schedule = excluded.schedule, command = excluded.command;
    select 1::bigint;
  $$;

  create schema net;
  create table net.requests (
    url text not null,
    headers jsonb not null,
    timeout_milliseconds integer not null
  );
  create function net.http_get(
    url text,
    params jsonb default '{}',
    headers jsonb default '{}',
    timeout_milliseconds integer default 5000
  ) returns bigint language sql as $$
    insert into net.requests values (url, headers, timeout_milliseconds);
    select 1::bigint;
  $$;

  create schema vault;
  create table vault.decrypted_secrets (
    name text primary key,
    decrypted_secret text not null
  );
`;

// Every migration in filename order, the same order Supabase would apply them.
async function listMigrations() {
  const files = (await readdir(MIGRATIONS))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      sql: await readFile(join(MIGRATIONS, file), "utf8"),
    })),
  );
}

// Each file runs twice in a row, which proves the "safe to run more than once"
// promise its header makes. (Only straight after itself: an old file can't be
// replayed after a newer one has added columns to a view it also defines.)
async function applyAll(db, migrations) {
  for (const { file, sql } of migrations) {
    try {
      await db.exec(sql);
      await db.exec(sql);
    } catch (error) {
      throw new Error(`${file}: ${error.message}`, { cause: error });
    }
  }
}

// `create extension ... with schema extensions` installs btree_gist where the
// constraints look for it; the search path mirrors Supabase's own.
async function emptyDatabase() {
  const db = await PGlite.create({ extensions: { btree_gist } });
  await db.exec(SUPABASE_STUBS);
  await db.exec(
    `alter database template1 set search_path = public, extensions`,
  );
  await db.exec(`set search_path = public, extensions`);
  return db;
}

export async function createTestDatabase() {
  const db = await emptyDatabase();
  await applyAll(db, await listMigrations());
  return { db };
}

// A database stopped just after `lastFile`, as production stands before an
// upgrade. A test fills it with rows the old schema allowed, then calls
// `upgrade`: a migration that works on an empty database can still fail on a
// real one.
export async function createOlderDatabase(lastFile) {
  const db = await emptyDatabase();
  const migrations = await listMigrations();
  const split = migrations.findIndex(({ file }) => file === lastFile);
  if (split === -1) throw new Error(`No migration named ${lastFile}`);

  await applyAll(db, migrations.slice(0, split + 1));

  return {
    db,
    upgrade: () => applyAll(db, migrations.slice(split + 1)),
  };
}

// Runs one statement as a Supabase API caller and always returns to superuser,
// so a failed call can't leave the next test running with the wrong rights.
// `caller` is null for a guest (anon), or { role: 'service_role' }, or a user
// { id, role, aal }.
export async function callAs(db, caller, sql, params = []) {
  const dbRole =
    caller === null
      ? "anon"
      : caller.role === "service_role"
        ? "service_role"
        : "authenticated";
  const claims =
    caller && caller.id
      ? {
          sub: caller.id,
          role: "authenticated",
          aal: caller.aal ?? "aal1",
          app_metadata: { role: caller.role },
        }
      : {};

  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify(claims),
  ]);
  await db.exec(`set role ${dbRole}`);
  try {
    const { rows } = await db.query(sql, params);
    return { rows, data: rows, error: null };
  } catch (error) {
    return {
      rows: [],
      data: null,
      error: { message: error.message, code: error.code },
    };
  } finally {
    await db.exec(`reset role`);
    await db.exec(`select set_config('request.jwt.claims', '', false)`);
  }
}
