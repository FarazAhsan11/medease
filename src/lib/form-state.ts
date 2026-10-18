import { z } from "zod";

// What a form's Server Action returns. `message` is shown as a toast and
// `fieldErrors` under each field.
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialFormState: FormState = { status: "idle" };

export function validationError(error: z.ZodError): FormState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

export function formError(message: string): FormState {
  return { status: "error", message };
}
