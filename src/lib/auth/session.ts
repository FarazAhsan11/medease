import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { dashboards, type DashboardRole } from "@/config/dashboards";
import { adminRoutes } from "@/config/routes";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { hasPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: DashboardRole;
  // "aal2" once the session has passed a second factor.
  assuranceLevel: string;
};

const userMetadataSchema = z.object({ full_name: z.string().min(1) });

// Verified on the server via the JWT; cached for the duration of a request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!hasPublicEnv()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  const { claims } = data;
  const role = getRoleFromAppMetadata(claims.app_metadata);
  if (!role) return null;

  const email = claims.email ?? "";
  const metadata = userMetadataSchema.safeParse(claims.user_metadata);

  return {
    id: claims.sub,
    email,
    name: metadata.success ? metadata.data.full_name : email,
    role,
    assuranceLevel: claims.aal ?? "aal1",
  };
});

// Use in every dashboard layout and data access path. The proxy only does an
// optimistic redirect; this is the real authorization check.
export async function requireRole(role: DashboardRole): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) redirect(dashboards[role].loginHref);
  if (user.role !== role) redirect(dashboards[user.role].home);

  return user;
}

// Admin pages also need a second factor. The database checks the same claim
// (private.is_admin), so this redirect is only the friendly half of the rule.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireRole("admin");

  if (user.assuranceLevel !== "aal2") redirect(adminRoutes.twoFactor);

  return user;
}
