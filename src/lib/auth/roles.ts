import { z } from "zod";

import type { DashboardRole } from "@/config/dashboards";

export const userRoleSchema = z.enum(["patient", "doctor", "lab"]);

// The role lives in Supabase `app_metadata`, which only the server (secret
// key) can write. Never read it from `user_metadata`; users can edit that.
export function getRoleFromAppMetadata(
  appMetadata: unknown,
): DashboardRole | null {
  const result = z
    .object({ role: userRoleSchema })
    .safeParse(appMetadata ?? {});

  return result.success ? result.data.role : null;
}

export function getRoleForPath(pathname: string): DashboardRole | null {
  for (const role of userRoleSchema.options) {
    if (pathname === `/${role}` || pathname.startsWith(`/${role}/`)) {
      return role;
    }
  }

  return null;
}
