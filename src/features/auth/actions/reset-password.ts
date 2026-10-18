"use server";

import { redirect } from "next/navigation";

import { dashboards } from "@/config/dashboards";
import { authFormError } from "@/features/auth/lib/auth-error";
import {
  consumeAuthToken,
  restoreAuthToken,
} from "@/features/auth/lib/auth-tokens";
import { resetPasswordSchema } from "@/features/auth/schemas/password";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// The token from the reset email is the permission check here.
export const resetPassword = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const { token, password } = parsed.data;
    const userId = await consumeAuthToken(token, "password_reset");
    if (!userId) {
      return formError(
        "This reset link has expired or was already used. Please request a new one.",
        "token_expired",
      );
    }

    // Resetting through the email also proves the address, so confirm it.
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) {
      await restoreAuthToken(token);
      return authFormError(error);
    }

    const role = getRoleFromAppMetadata(data.user.app_metadata);
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.user.email ?? "",
      password,
    });

    if (signInError || !role) {
      await setFlash(
        "success",
        "Your password has been updated. Log in with your new password.",
      );
      redirect(role ? dashboards[role].loginHref : "/login");
    }

    await setFlash("success", "Your password has been updated.");
    redirect(dashboards[role].home);
  },
);
