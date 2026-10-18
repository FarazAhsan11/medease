"use server";

import { sendPasswordResetEmail } from "@/features/auth/lib/auth-emails";
import { findAuthUserByEmail } from "@/features/auth/lib/auth-users";
import { forgotPasswordSchema } from "@/features/auth/schemas/password";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";

export const requestPasswordReset = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = forgotPasswordSchema.safeParse({
      email: formData.get("email"),
    });
    if (!parsed.success) return validationError(parsed.error);

    // Same answer whether or not the account exists (or is rate limited), so
    // this can't be used to find out who has an account.
    const user = await findAuthUserByEmail(parsed.data.email);
    if (user) {
      await sendPasswordResetEmail({
        userId: user.id,
        email: user.email,
        name: user.full_name,
      });
    }

    return {
      status: "success",
      message: "If that email has an account, a reset link is on its way.",
    };
  },
);
