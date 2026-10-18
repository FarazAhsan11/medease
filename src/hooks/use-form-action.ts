"use client";

import { unstable_rethrow } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { NETWORK_ERROR_MESSAGE } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";

type Options<State> = {
  // Runs when the action succeeds, e.g. to close a dialog or reset a form.
  onSuccess?: (state: State) => void;
};

// Runs a Server Action from a form and toasts its result. Submitting through
// onSubmit (not the `action` prop) keeps what the user typed when it fails.
export function useFormAction<State extends FormState>(
  action: (state: Awaited<State>, formData: FormData) => Promise<State>,
  initialState: Awaited<State>,
  { onSuccess }: Options<State> = {},
) {
  const [state, formAction, pending] = useActionState(
    async (previous: Awaited<State>, formData: FormData) => {
      try {
        const next = await action(previous, formData);
        if (next.status === "success") onSuccess?.(next);
        return next;
      } catch (error) {
        // Lets redirect() from the action through to the router.
        unstable_rethrow(error);
        // The request never reached the server (offline, server down).
        return {
          ...previous,
          status: "error",
          code: "network_error",
          message: navigator.onLine
            ? NETWORK_ERROR_MESSAGE
            : "You're offline. Reconnect to the internet and try again.",
          fieldErrors: undefined,
        };
      }
    },
    initialState,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.status === "error") toast.error(state.message);
    if (state.status === "success") toast.success(state.message);
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return { state, pending, onSubmit, fieldError };
}
