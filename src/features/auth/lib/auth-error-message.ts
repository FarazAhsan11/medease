import type { AuthError } from "@supabase/supabase-js";

// Turns Supabase Auth errors into copy we can show. Codes:
// https://supabase.com/docs/guides/auth/debugging/error-codes
export function getAuthErrorMessage(error: AuthError) {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Log in instead.";
    case "weak_password":
      return error.message;
    case "same_password":
      return "Choose a password you haven't used before.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "signup_disabled":
      return "Sign-ups are turned off right now. Please try again later.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
