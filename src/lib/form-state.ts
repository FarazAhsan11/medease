import { z } from "zod";

// What a form's Server Action returns. `message` is shown as a toast,
// `fieldErrors` under each field, and `code` lets a form react to a specific
// failure (for example highlighting both login fields on bad credentials).
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialFormState: FormState = { status: "idle" };

export function validationError(error: z.ZodError): FormState {
  return {
    status: "error",
    code: "validation_failed",
    message: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

export function formError(message: string, code?: string): FormState {
  return { status: "error", message, code };
}
