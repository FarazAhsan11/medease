import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DashboardRole } from "@/config/dashboards";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-message";
import { getAuthRedirectUrl } from "@/features/auth/lib/auth-redirect-url";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
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
  | { status: "error"; message: string };

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

  if (error) return { status: "error", message: getAuthErrorMessage(error) };

  const { user, session } = data;

  // With email confirmation on, Supabase returns a user with no identities
  // for an address that is already registered instead of an error.
  if (!user || user.identities?.length === 0) {
    return { status: "error", message: EXISTING_ACCOUNT };
  }

  // An unconfirmed account that signs up again keeps the role it started with,
  // so nobody can flip someone else's pending account to another role.
  const existingRole = getRoleFromAppMetadata(user.app_metadata);
  if (existingRole && existingRole !== role) {
    return { status: "error", message: EXISTING_ACCOUNT };
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
      message: "We couldn't create your account. Please try again.",
    };
  }

  if (!session) return { status: "confirm-email" };

  // The session was issued before the role was set; refresh it so the JWT
  // carries app_metadata.role.
  await supabase.auth.refreshSession({ refresh_token: session.refresh_token });

  return { status: "signed-in" };
}
