import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

// Privileged client that bypasses Row Level Security. Use only in trusted
// server code (Server Actions, Route Handlers, scripts) after checking that
// the current user is allowed to perform the operation.
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SECRET_KEY } = getServerEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
