import "server-only";

import { unstable_rethrow } from "next/navigation";

import { getUnexpectedErrorMessage, isNetworkError } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";

// Safety net for form Server Actions. Expected failures are returned as
// FormState by the action itself; anything that throws is logged and turned
// into a message instead of crashing the page. redirect() still works.
export function withFormErrors<State extends FormState>(
  action: (state: State, formData: FormData) => Promise<State>,
) {
  return async (state: State, formData: FormData): Promise<State> => {
    try {
      return await action(state, formData);
    } catch (error) {
      unstable_rethrow(error);
      // Log the message only; never the submitted form data.
      console.error(
        "Form action failed:",
        error instanceof Error ? error.message : error,
      );

      return {
        ...state,
        status: "error",
        message: getUnexpectedErrorMessage(error),
        code: isNetworkError(error) ? "network_error" : "unexpected_error",
        fieldErrors: undefined,
      };
    }
  };
}
