import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DashboardRole } from "@/config/dashboards";
import { sendConfirmationEmail } from "@/features/auth/lib/auth-emails";
import { authFormError } from "@/features/auth/lib/auth-error";
import { getUnexpectedErrorMessage, isNetworkError } from "@/lib/errors";
import { formError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";

type NewAccount = {
  role: Exclude<DashboardRole, "admin">;
  email: string;
  password: string;
  fullName: string;
  next?: string | null;
  // Writes the role's profile row (and any uploads) with the admin client.
  saveProfile: (admin: SupabaseClient, userId: string) => Promise<void>;
};

type CreateAccountResult =
  { status: "confirm-email" } | { status: "error"; error: FormState };

// Creates the account with the admin API, so Supabase sends no email and the
// role is set atomically, then sends our own confirmation email.
export async function createAccount({
  role,
  email,
  password,
  fullName,
  next,
  saveProfile,
}: NewAccount): Promise<CreateAccountResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    app_metadata: { role },
    // Only the display name goes in user_metadata; it ends up in the JWT.
    user_metadata: { full_name: fullName },
  });

  if (error) return { status: "error", error: authFormError(error) };

  const userId = data.user.id;
  let step = "profile";

  try {
    await saveProfile(admin, userId);
    step = "email";
    await sendConfirmationEmail({ userId, email, name: fullName }, next);
  } catch (cause) {
    console.error(
      `Sign-up failed at the ${step} step:`,
      cause instanceof Error ? cause.message : cause,
    );
    // Roll back so the address can be used again straight away.
    await admin.auth.admin.deleteUser(userId);

    return {
      status: "error",
      error: isNetworkError(cause)
        ? formError(getUnexpectedErrorMessage(cause), "network_error")
        : step === "email"
          ? formError(
              "We couldn't send your confirmation email. Please try again in a moment.",
              "email_failed",
            )
          : formError(
              "We couldn't finish setting up your account. Please try again in a moment.",
              "profile_setup_failed",
            ),
    };
  }

  return { status: "confirm-email" };
}
