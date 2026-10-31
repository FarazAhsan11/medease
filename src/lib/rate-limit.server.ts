import "server-only";

import { getClientIp, hashIdentifier } from "@/lib/request-identity.server";
import { createAdminClient } from "@/lib/supabase/admin";

type RateLimit = { name: string; limit: number; windowSeconds: number };

const FIFTEEN_MINUTES = 15 * 60;
const ONE_HOUR = 60 * 60;

export const rateLimits = {
  // One address retyping a password, and one network trying many accounts.
  signInAccount: {
    name: "sign-in-account",
    limit: 10,
    windowSeconds: FIFTEEN_MINUTES,
  },
  signInIp: { name: "sign-in-ip", limit: 30, windowSeconds: FIFTEEN_MINUTES },
  signUpIp: { name: "sign-up-ip", limit: 10, windowSeconds: ONE_HOUR },
  passwordResetIp: { name: "reset-ip", limit: 10, windowSeconds: ONE_HOUR },
  resendConfirmationIp: {
    name: "resend-ip",
    limit: 10,
    windowSeconds: ONE_HOUR,
  },
  contactIp: { name: "contact-ip", limit: 5, windowSeconds: ONE_HOUR },
  twoFactorCode: {
    name: "2fa-code",
    limit: 10,
    windowSeconds: FIFTEEN_MINUTES,
  },
  recoveryCode: {
    name: "2fa-recovery",
    limit: 5,
    windowSeconds: FIFTEEN_MINUTES,
  },
} as const satisfies Record<string, RateLimit>;

export const RATE_LIMITED_MESSAGE =
  "Too many attempts. Please wait a few minutes and try again.";

// Counts this attempt and says whether it's over the limit. The identifier is
// hashed, so the table never holds an email or an IP address.
//
// If the check itself fails, the request goes through: a database hiccup
// shouldn't lock every patient out of signing in, and Supabase Auth has its own
// limits behind this one.
export async function isRateLimited(rule: RateLimit, identifier: string) {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_bucket: `${rule.name}:${hashIdentifier(identifier)}`,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed:", error.code);
    return false;
  }

  return data === false;
}

export async function isIpRateLimited(rule: RateLimit) {
  return isRateLimited(rule, await getClientIp());
}
