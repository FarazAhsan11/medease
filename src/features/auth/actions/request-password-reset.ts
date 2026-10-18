"use server";

import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-message";
import { getAuthRedirectUrl } from "@/features/auth/lib/auth-redirect-url";
import { forgotPasswordSchema } from "@/features/auth/schemas/password";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: await getAuthRedirectUrl("/reset-password") },
  );

  // Unknown emails succeed too, so this can't be used to find accounts.
  if (error) return formError(getAuthErrorMessage(error));

  return {
    status: "success",
    message: "If that email has an account, a reset link is on its way.",
  };
}
