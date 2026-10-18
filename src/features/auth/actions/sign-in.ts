"use server";

import { redirect } from "next/navigation";

import { authFormError } from "@/features/auth/lib/auth-error";
import { getAuthRedirectUrl } from "@/features/auth/lib/auth-redirect-url";
import { signInSchema } from "@/features/auth/schemas/sign-in";
import { getPostLoginPath } from "@/lib/auth/redirects";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export const signIn = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    const next = formData.get("next");

    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error?.code === "email_not_confirmed") {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: parsed.data.email,
        options: { emailRedirectTo: await getAuthRedirectUrl() },
      });

      return resendError
        ? formError(
            "Please confirm your email before logging in. Use the link we sent when you signed up.",
            error.code,
          )
        : formError(
            "Please confirm your email before logging in. We've sent a new link to your inbox.",
            error.code,
          );
    }

    if (error) return authFormError(error);

    const role = getRoleFromAppMetadata(data.user.app_metadata);

    if (!role) {
      await supabase.auth.signOut();
      return formError(
        "Your account isn't fully set up yet. Please contact support.",
        "missing_role",
      );
    }

    await setFlash("success", "Welcome back! You're signed in.");
    redirect(getPostLoginPath(role, typeof next === "string" ? next : null));
  },
);
