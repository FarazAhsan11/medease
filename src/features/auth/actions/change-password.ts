"use server";

import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-message";
import { changePasswordSchema } from "@/features/auth/schemas/password";
import { getSessionUser } from "@/lib/auth/session";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export async function changePassword(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const user = await getSessionUser();
  if (!user) return formError("Your session has expired. Please log in again.");

  const supabase = await createClient();

  // Confirm it's really them before changing the password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return {
      status: "error",
      message: "Your current password is incorrect.",
      fieldErrors: { currentPassword: ["Your current password is incorrect."] },
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return formError(getAuthErrorMessage(error));

  return { status: "success", message: "Your password has been updated." };
}
