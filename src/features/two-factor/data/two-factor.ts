import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// The signed-in user's paired authenticator app, if they've finished pairing one.
// A session ended on another device keeps a valid token until it expires, so
// this can fail while the page itself still loads: that isn't worth an error page.
export async function getVerifiedFactorId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (isAuthSessionMissingError(error)) return null;
  if (error) throw new Error(`mfa: ${error.message}`);
  return data.totp[0]?.id ?? null;
}
