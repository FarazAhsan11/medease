"use server";

import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-message";
import { getAuthRedirectUrl } from "@/features/auth/lib/auth-redirect-url";
import { emailSchema } from "@/features/auth/schemas/sign-in";
import { formError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export async function resendConfirmation(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return formError("Enter a valid email address.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: await getAuthRedirectUrl() },
  });

  if (error) return formError(getAuthErrorMessage(error));

  return { status: "success", message: "We've sent you a new link." };
}
