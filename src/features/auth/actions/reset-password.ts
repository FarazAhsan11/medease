"use server";

import { redirect } from "next/navigation";

import { dashboards } from "@/config/dashboards";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-message";
import { resetPasswordSchema } from "@/features/auth/schemas/password";
import { getSessionUser } from "@/lib/auth/session";
import { setFlash } from "@/lib/flash.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Runs after the reset link signed the user in with a recovery session.
export async function resetPassword(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const user = await getSessionUser();
  if (!user) {
    return formError("Your reset link has expired. Please request a new one.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return formError(getAuthErrorMessage(error));

  await setFlash("success", "Your password has been updated.");
  redirect(dashboards[user.role].home);
}
