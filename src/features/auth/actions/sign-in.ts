"use server";

import { redirect } from "next/navigation";

import { sendConfirmationEmail } from "@/features/auth/lib/auth-emails";
import { authFormError } from "@/features/auth/lib/auth-error";
import { findAuthUserByEmail } from "@/features/auth/lib/auth-users";
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

    // We confirm emails ourselves, so check it here whatever Supabase's
    // "Confirm email" setting is.
    const unconfirmed =
      error?.code === "email_not_confirmed" ||
      (!error && !data.user.email_confirmed_at);

    if (unconfirmed) {
      if (!error) await supabase.auth.signOut();
      return resendConfirmation(parsed.data.email);
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

async function resendConfirmation(email: string): Promise<FormState> {
  const user = await findAuthUserByEmail(email);
  const status =
    user && !user.email_confirmed_at
      ? await sendConfirmationEmail({
          userId: user.id,
          email: user.email,
          name: user.full_name,
        })
      : "sent";

  return formError(
    status === "sent"
      ? "Please confirm your email before logging in. We've sent a new link to your inbox."
      : "Please confirm your email before logging in. Use the link we sent you a moment ago.",
    "email_not_confirmed",
  );
}
