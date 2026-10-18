"use server";

import { authFormError } from "@/features/auth/lib/auth-error";
import { changePasswordSchema } from "@/features/auth/schemas/password";
import { getSessionUser } from "@/lib/auth/session";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export const changePassword = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (!user) {
      return formError(
        "Your session has expired. Please log in again.",
        "session_expired",
      );
    }

    const supabase = await createClient();

    // Confirm it's really them before changing the password.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });

    if (verifyError?.code === "invalid_credentials") {
      return {
        status: "error",
        code: verifyError.code,
        message: "Your current password is incorrect.",
        fieldErrors: {
          currentPassword: ["Your current password is incorrect."],
        },
      };
    }
    if (verifyError) return authFormError(verifyError);

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error?.code === "same_password") {
      return {
        status: "error",
        code: error.code,
        message: "Your new password must be different from your current one.",
        fieldErrors: {
          password: ["Choose a password you haven't used before."],
        },
      };
    }
    if (error) return authFormError(error);

    return { status: "success", message: "Your password has been updated." };
  },
);
