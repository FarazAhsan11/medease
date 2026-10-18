import {
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
  type AuthError,
} from "@supabase/supabase-js";

import { NETWORK_ERROR_MESSAGE } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";

const EXISTING_ACCOUNT =
  "An account with this email already exists. Log in instead.";
const SESSION_EXPIRED = "Your session has expired. Please log in again.";
const LINK_EXPIRED =
  "That link has expired or was opened in a different browser. Please request a new one.";

// Friendlier copy for the Supabase Auth error codes users actually hit:
// https://supabase.com/docs/guides/auth/debugging/error-codes
const messages: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email before logging in.",
  user_already_exists: EXISTING_ACCOUNT,
  email_exists: EXISTING_ACCOUNT,
  same_password: "Your new password must be different from your current one.",
  email_address_invalid: "Enter a valid email address.",
  email_address_not_authorized:
    "We can't send emails to this address yet. Please contact support.",
  signup_disabled:
    "New sign-ups are turned off right now. Please try again later.",
  email_provider_disabled:
    "Email sign-in is turned off right now. Please contact support.",
  user_banned: "This account has been suspended. Please contact support.",
  user_not_found: "We couldn't find an account with those details.",
  session_expired: SESSION_EXPIRED,
  session_not_found: SESSION_EXPIRED,
  refresh_token_not_found: SESSION_EXPIRED,
  refresh_token_already_used: SESSION_EXPIRED,
  reauthentication_needed:
    "For your security, please log in again before changing your password.",
  otp_expired: LINK_EXPIRED,
  flow_state_expired: LINK_EXPIRED,
  flow_state_not_found: LINK_EXPIRED,
  bad_code_verifier: LINK_EXPIRED,
  over_email_send_rate_limit:
    "We've sent too many emails to this address. Please wait a few minutes and try again.",
  over_request_rate_limit:
    "Too many attempts. Please wait a minute and try again.",
  request_timeout: "The request timed out. Please try again.",
};

export function getAuthErrorMessage(error: AuthError) {
  if (isAuthRetryableFetchError(error) || error.status === 0) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (isAuthWeakPasswordError(error)) {
    return error.reasons.includes("pwned")
      ? "This password has appeared in a data breach. Please choose a different one."
      : error.message;
  }

  const known = error.code ? messages[error.code] : undefined;
  if (known) return known;

  if (error.status && error.status >= 500) {
    return "Our sign-in service is having trouble right now. Please try again in a moment.";
  }

  // Supabase's own messages are written for end users, so show the real one.
  return error.message || "Something went wrong. Please try again.";
}

export function authFormError(error: AuthError): FormState {
  if (error.code === "email_address_not_authorized") {
    console.warn(
      "Supabase refused to send an email: the default email service only delivers to project team members. Set up custom SMTP in Authentication > Emails.",
    );
  } else if (!error.code || !messages[error.code]) {
    console.warn(
      "Supabase auth error:",
      error.code ?? error.name,
      error.status,
    );
  }

  return {
    status: "error",
    message: getAuthErrorMessage(error),
    code: isAuthRetryableFetchError(error)
      ? "network_error"
      : (error.code ?? "auth_error"),
  };
}
