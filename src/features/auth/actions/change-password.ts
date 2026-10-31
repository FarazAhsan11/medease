"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";

import { authFormError } from "@/features/auth/lib/auth-error";
import { changePasswordSchema } from "@/features/auth/schemas/password";
import { getSessionUser } from "@/lib/auth/session";
import { getPublicEnv } from "@/lib/env";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { recordSecurityEvent } from "@/lib/security-events.server";
import { createClient } from "@/lib/supabase/server";

// A throwaway client, because signing in on the session's own client would swap
// a two-factor session for a password-only one, and Supabase refuses to change
// a password from that.
async function checkPassword(email: string, password: string) {
  const env = getPublicEnv();
  const client = createPlainClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (!error) await client.auth.signOut({ scope: "local" });

  return error;
}

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

    // Confirm it's really them before changing the password.
    const verifyError = await checkPassword(
      user.email,
      parsed.data.currentPassword,
    );

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

    const supabase = await createClient();
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

    await recordSecurityEvent(user.id, "auth.password_changed");

    return { status: "success", message: "Your password has been updated." };
  },
);
