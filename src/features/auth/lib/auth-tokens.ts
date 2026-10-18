import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type TokenPurpose = "email_confirmation" | "password_reset";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const lifetimes: Record<TokenPurpose, number> = {
  email_confirmation: DAY_MS,
  password_reset: HOUR_MS,
};

// Per user and purpose: one email a minute, five an hour.
const COOLDOWN_MS = 60 * 1000;
const MAX_PER_HOUR = 5;

type IssueResult =
  | { status: "issued"; token: string; id: string }
  | { status: "cooldown" | "rate_limited" };

// Only the SHA-256 of a token is stored. Tokens are 256 random bits, so a
// fast hash is enough and lets us look rows up by hash directly.
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function fail(step: string, message: string): never {
  throw new Error(`auth_tokens ${step}: ${message}`);
}

export async function issueAuthToken(
  userId: string,
  purpose: TokenPurpose,
): Promise<IssueResult> {
  const admin = createAdminClient();
  const now = Date.now();

  const { data: recent, error: recentError } = await admin
    .from("auth_tokens")
    .select("created_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .gte("created_at", new Date(now - HOUR_MS).toISOString())
    .order("created_at", { ascending: false });
  if (recentError) fail("lookup", recentError.message);

  if (recent.length > 0) {
    if (now - new Date(recent[0].created_at).getTime() < COOLDOWN_MS) {
      return { status: "cooldown" };
    }
    if (recent.length >= MAX_PER_HOUR) return { status: "rate_limited" };
  }

  // A new link replaces any earlier one, and day-old rows are pruned.
  const { error: retireError } = await admin
    .from("auth_tokens")
    .update({ used_at: new Date(now).toISOString() })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("used_at", null);
  if (retireError) fail("retire", retireError.message);

  await admin
    .from("auth_tokens")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", new Date(now - DAY_MS).toISOString());

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await admin
    .from("auth_tokens")
    .insert({
      user_id: userId,
      purpose,
      token_hash: hashToken(token),
      expires_at: new Date(now + lifetimes[purpose]).toISOString(),
    })
    .select("id")
    .single();
  if (error) fail("insert", error.message);

  return { status: "issued", token, id: data.id };
}

// For when the email carrying a fresh token couldn't be sent.
export async function deleteAuthToken(id: string) {
  await createAdminClient().from("auth_tokens").delete().eq("id", id);
}

// Checks a token without using it up, so email scanners that open links
// can't burn a password reset link before the user does.
export async function findValidAuthToken(token: string, purpose: TokenPurpose) {
  const { data, error } = await createAdminClient()
    .from("auth_tokens")
    .select("user_id")
    .eq("token_hash", hashToken(token))
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) fail("check", error.message);

  return data?.user_id ?? null;
}

// Marks a token used in a single UPDATE, so it works exactly once even if two
// requests race. Returns the user it belonged to, or null.
export async function consumeAuthToken(token: string, purpose: TokenPurpose) {
  const { data, error } = await createAdminClient()
    .from("auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();
  if (error) fail("consume", error.message);

  return data?.user_id ?? null;
}

// Puts a consumed token back when the step it unlocked failed (for example
// the new password was rejected), so the user can retry with the same link.
export async function restoreAuthToken(token: string) {
  await createAdminClient()
    .from("auth_tokens")
    .update({ used_at: null })
    .eq("token_hash", hashToken(token));
}
