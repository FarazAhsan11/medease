import type { PostgrestError } from "@supabase/supabase-js";

import { NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from "@/lib/errors";
import { formError, type FormState } from "@/lib/form-state";

// Our database functions raise short codes (e.g. "slot_taken"); `messages`
// turns the ones a feature expects into friendly text. Anything else is
// logged by code only, never with the request's data.
export function databaseErrorState(
  error: PostgrestError,
  messages: Record<string, string>,
  context: string,
): FormState {
  const known = messages[error.message];
  if (known) return formError(known, error.message);

  if (/fetch failed|network/i.test(error.message)) {
    return formError(NETWORK_ERROR_MESSAGE, "network_error");
  }

  console.error(`${context} failed:`, error.code, error.message);
  return formError(UNEXPECTED_ERROR_MESSAGE, "unexpected_error");
}
