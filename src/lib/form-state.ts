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

// Like validationError, but keys each error by its full path
// ("items.0.dose"), for forms with repeated rows.
export function nestedValidationError(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return {
    status: "error",
    code: "validation_failed",
    message: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

export function formError(message: string, code?: string): FormState {
  return { status: "error", message, code };
}
