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
  unsubscribeIp: { name: "unsubscribe-ip", limit: 20, windowSeconds: ONE_HOUR },
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
  // Each call hands out signed upload links for one batch of files; counted
  // per account, which is always signed in.
  uploadUser: { name: "upload-user", limit: 20, windowSeconds: ONE_HOUR },
  // A lab sending its verification details, with or without a new file.
  verificationUser: {
    name: "verification-user",
    limit: 20,
    windowSeconds: ONE_HOUR,
  },
  // Per account: generous for a real conversation, a stop for a script.
  messageUser: { name: "message-user", limit: 200, windowSeconds: ONE_HOUR },
  // Marking read follows the messages that arrive, which the limit above caps.
  messageReadUser: {
    name: "message-read-user",
    limit: 600,
    windowSeconds: ONE_HOUR,
  },
  // A lab editing its test catalog or home collection setup: each switch
  // flipped is one write.
  catalogUser: { name: "catalog-user", limit: 300, windowSeconds: ONE_HOUR },
  // A patient saving or deleting a saved address.
  addressUser: { name: "address-user", limit: 60, windowSeconds: ONE_HOUR },
  // A patient booking lab tests: a family's needs, not a script's.
  labBookingUser: {
    name: "lab-booking-user",
    limit: 20,
    windowSeconds: ONE_HOUR,
  },
  // A patient cancelling or moving their lab bookings. Each booking moves at
  // most 3 times; this stops a script cycling bookings to hold windows.
  labBookingChangeUser: {
    name: "lab-booking-change-user",
    limit: 30,
    windowSeconds: ONE_HOUR,
  },
  // Opening a checkout: a few tries per booking, at most 20 bookings held.
  paymentStartUser: {
    name: "payment-start-user",
    limit: 30,
    windowSeconds: ONE_HOUR,
  },
  // A lab moving bookings along: a busy day is a few hundred moves.
  labBookingMoveUser: {
    name: "lab-booking-move-user",
    limit: 600,
    windowSeconds: ONE_HOUR,
  },
  // A lab asking for report upload links. Separate from uploadUser, which is
  // sized for a person's own files: a lab publishes a report per booking, a
  // few hundred on a busy day.
  labReportUploadUser: {
    name: "lab-report-upload-user",
    limit: 300,
    windowSeconds: ONE_HOUR,
  },
  // A doctor ordering, changing or cancelling lab tests: a full clinic day
  // with room for edits.
  labOrderUser: { name: "lab-order-user", limit: 120, windowSeconds: ONE_HOUR },
  // Starting a conversation, or a doctor extending or closing one.
  conversationUser: {
    name: "conversation-user",
    limit: 60,
    windowSeconds: ONE_HOUR,
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
