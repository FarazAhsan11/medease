import "server-only";

import { createClient } from "@/lib/supabase/server";

// The admin's paired authenticator app, if they've finished pairing one.
export async function getVerifiedFactorId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) throw new Error(`mfa: ${error.message}`);
  return data.totp[0]?.id ?? null;
}
