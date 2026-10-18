"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import type { FormState } from "@/lib/form-state";

// Runs a Server Action from a form and toasts its result. Submitting through
// onSubmit (not the `action` prop) keeps what the user typed when it fails.
export function useFormAction<State extends FormState>(
  action: (state: Awaited<State>, formData: FormData) => Promise<State>,
  initialState: Awaited<State>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

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
