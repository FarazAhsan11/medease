import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AuthUser = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  full_name: string | null;
  role: string | null;
};

// auth.users isn't exposed through the API, so this goes through the
// find_auth_user_by_email function (secret key only).
export async function findAuthUserByEmail(
  email: string,
): Promise<AuthUser | null> {
  const { data, error } = await createAdminClient().rpc(
    "find_auth_user_by_email",
    { user_email: email },
  );
  if (error) throw new Error(`find_auth_user_by_email: ${error.message}`);

  return (data as AuthUser[] | null)?.[0] ?? null;
}
