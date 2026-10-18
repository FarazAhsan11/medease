"use server";

import { redirect } from "next/navigation";

import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-message";
import { getAuthRedirectUrl } from "@/features/auth/lib/auth-redirect-url";
import { signInSchema } from "@/features/auth/schemas/sign-in";
import { getPostLoginPath } from "@/lib/auth/redirects";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { setFlash } from "@/lib/flash.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export async function signIn(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const next = formData.get("next");

  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      await supabase.auth.resend({
        type: "signup",
        email: parsed.data.email,
        options: { emailRedirectTo: await getAuthRedirectUrl() },
      });
      return formError(
        "Confirm your email to log in. We've sent a new link to your inbox.",
      );
    }
    if (error.code === "invalid_credentials") {
      return formError("Incorrect email or password.");
    }
    return formError(getAuthErrorMessage(error));
  }

  const role = getRoleFromAppMetadata(data.user.app_metadata);

  if (!role) {
    await supabase.auth.signOut();
    return formError("Your account isn't set up yet. Please contact support.");
  }

  await setFlash("success", "Welcome back! You're signed in.");
  redirect(getPostLoginPath(role, typeof next === "string" ? next : null));
}
