"use server";

import { authFormError } from "@/features/auth/lib/auth-error";
import { getAuthRedirectUrl } from "@/features/auth/lib/auth-redirect-url";
import { emailSchema } from "@/features/auth/schemas/sign-in";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export const resendConfirmation = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = emailSchema.safeParse(formData.get("email"));
    if (!parsed.success) return formError("Enter a valid email address.");

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data,
      options: { emailRedirectTo: await getAuthRedirectUrl() },
    });

    if (error) return authFormError(error);

    return { status: "success", message: "We've sent you a new link." };
  },
);
