import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DashboardRole } from "@/config/dashboards";
import { authFormError } from "@/features/auth/lib/auth-error";
import { getAuthRedirectUrl } from "@/features/auth/lib/auth-redirect-url";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { getUnexpectedErrorMessage, isNetworkError } from "@/lib/errors";
import { formError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type NewAccount = {
  role: DashboardRole;
  email: string;
  password: string;
  fullName: string;
  next?: string | null;
  // Writes the role's profile row (and any uploads) with the admin client.
  saveProfile: (admin: SupabaseClient, userId: string) => Promise<void>;
};

type CreateAccountResult =
  | { status: "signed-in" }
  | { status: "confirm-email" }
  | { status: "error"; error: FormState };

const EXISTING_ACCOUNT =
  "An account with this email already exists. Log in instead.";

export async function createAccount({
  role,
  email,
  password,
  fullName,
  next,
  saveProfile,
}: NewAccount): Promise<CreateAccountResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Only the display name goes in user_metadata; it ends up in the JWT.
      data: { full_name: fullName },
      emailRedirectTo: await getAuthRedirectUrl(next),
    },
  });

  if (error) return { status: "error", error: authFormError(error) };

  const { user, session } = data;

  // With email confirmation on, Supabase returns a user with no identities
  // for an address that is already registered instead of an error.
  if (!user || user.identities?.length === 0) {
    return {
      status: "error",
      error: formError(EXISTING_ACCOUNT, "email_exists"),
    };
  }

  // An unconfirmed account that signs up again keeps the role it started with,
  // so nobody can flip someone else's pending account to another role.
  const existingRole = getRoleFromAppMetadata(user.app_metadata);
  if (existingRole && existingRole !== role) {
    return {
      status: "error",
      error: formError(EXISTING_ACCOUNT, "email_exists"),
    };
  }

  const admin = createAdminClient();

  try {
    const { error: roleError } = await admin.auth.admin.updateUserById(
      user.id,
      { app_metadata: { role } },
    );
    if (roleError) throw roleError;

    await saveProfile(admin, user.id);
  } catch (cause) {
    console.error(
      "Sign-up failed:",
      cause instanceof Error ? cause.message : cause,
    );
    // Roll back a brand-new account so the email can be used again.
    if (!existingRole) await admin.auth.admin.deleteUser(user.id);
    if (session) await supabase.auth.signOut();

    return {
      status: "error",
      error: isNetworkError(cause)
        ? formError(getUnexpectedErrorMessage(cause), "network_error")
        : formError(
            "We couldn't finish setting up your account. Please try again in a moment.",
            "profile_setup_failed",
          ),
    };
  }

  if (!session) return { status: "confirm-email" };

  // The session was issued before the role was set; refresh it so the JWT
  // carries app_metadata.role.
  await supabase.auth.refreshSession({ refresh_token: session.refresh_token });

  return { status: "signed-in" };
}
