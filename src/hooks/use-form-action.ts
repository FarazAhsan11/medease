"use client";

import { unstable_rethrow } from "next/navigation";
import { startTransition, useActionState, type FormEvent } from "react";
import { toast } from "sonner";

import { NETWORK_ERROR_MESSAGE } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";

type Options<State> = {
  // Runs when the action succeeds, e.g. to close a dialog or reset a form.
  onSuccess?: (state: State) => void;
};

function showResult({ status, message }: FormState) {
  if (!message) return;
  if (status === "error") toast.error(message);
  if (status === "success") toast.success(message);
}

// Runs a Server Action from a form and toasts its result. Submitting through
// onSubmit (not the `action` prop) keeps what the user typed when it fails.
// The toast fires when the action returns, not from an effect: a success
// often refreshes the page and removes the form (a cancelled visit, a removed
// row, a closed editor), and an effect in a removed form never runs.
export function useFormAction<State extends FormState>(
  action: (state: Awaited<State>, formData: FormData) => Promise<State>,
  initialState: Awaited<State>,
  { onSuccess }: Options<State> = {},
) {
  const [state, formAction, pending] = useActionState(
    async (previous: Awaited<State>, formData: FormData) => {
      try {
        const next = await action(previous, formData);
        showResult(next);
        if (next.status === "success") onSuccess?.(next);
        return next;
      } catch (error) {
        // Lets redirect() from the action through to the router.
        unstable_rethrow(error);
        // The request never reached the server (offline, server down).
        const failed = {
          ...previous,
          status: "error",
          code: "network_error",
          message: navigator.onLine
            ? NETWORK_ERROR_MESSAGE
            : "You're offline. Reconnect to the internet and try again.",
          fieldErrors: undefined,
        } satisfies Awaited<State>;
        showResult(failed);
        return failed;
      }
    },
    initialState,
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return { state, pending, onSubmit, fieldError };
}
