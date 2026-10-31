import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { dashboards, type DashboardRole } from "@/config/dashboards";
import { twoFactorRoute } from "@/config/routes";
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

// These roles handle other people's health data, so a password isn't enough.
// Keep in step with private.second_factor_ok in the database.
const secondFactorRoles: readonly DashboardRole[] = ["doctor", "lab", "admin"];

export const isSecondFactorRequired = (role: DashboardRole) =>
  secondFactorRoles.includes(role);

// Asks Supabase rather than trusting the session cookie. Cached because
// requireRole runs in layouts and pages alike. If the check fails the page opens
// and the database rule still guards the data.
const hasPairedFactor = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();

  return (data?.totp.length ?? 0) > 0;
});

// Patients choose, so for them it depends on whether they've paired an app.
async function needsSecondFactorCheck(user: SessionUser) {
  if (user.assuranceLevel === "aal2") return false;
  if (isSecondFactorRequired(user.role)) return true;

  return hasPairedFactor();
}

// Use in every dashboard layout and data access path. The proxy only does an
// optimistic redirect; this is the real authorization check. It covers the
// second factor too: the database enforces the same rule on clinical data
// (private.second_factor_ok), so this redirect is the friendly half of it.
export async function requireRole(role: DashboardRole): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) redirect(dashboards[role].loginHref);
  if (user.role !== role) redirect(dashboards[user.role].home);
  if (await needsSecondFactorCheck(user)) redirect(twoFactorRoute);

  return user;
}

export const requireAdmin = () => requireRole("admin");
