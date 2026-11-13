import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { labRoutes } from "@/config/routes";
import {
  labMemberRoleSchema,
  labRoleCan,
  type LabMemberRole,
  type LabPermission,
} from "@/features/lab-staff/lib/lab-permissions";
import {
  getSessionUser,
  requireRole,
  type SessionUser,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type LabMember = {
  user: SessionUser;
  // lab_profiles.id: what every lab table calls lab_id.
  labId: string;
  labName: string;
  role: LabMemberRole;
};

const membershipSchema = z.object({
  lab_id: z.uuid(),
  role: labMemberRoleSchema,
  status: z.enum(["invited", "active", "removed"]),
  lab_name: z.string(),
});

export type LabMembershipStatus = z.infer<typeof membershipSchema>["status"];

// The person's own membership and the lab's name, read with their session
// once per request. Staff can't read lab_profiles itself.
export const getMembership = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_membership");
  if (error) throw new Error(`get_lab_membership: ${error.message}`);

  const row = z.array(membershipSchema).parse(data)[0];
  return row ?? null;
});

const toMember = (
  user: SessionUser,
  membership: z.infer<typeof membershipSchema>,
): LabMember => ({
  user,
  labId: membership.lab_id,
  labName: membership.lab_name,
  role: membership.role,
});

// Use in every lab page and action instead of requireRole("lab"): it finds the
// lab the person works for and checks their role. The database checks the same
// on every read and write; this sends people to the right page first. Someone
// the lab removed lands on a page that only lets them sign out.
export async function requireLabMember(
  permission?: LabPermission,
): Promise<LabMember> {
  const user = await requireRole("lab");
  const membership = await getMembership();

  if (!membership || membership.status !== "active") {
    redirect(labRoutes.accessEnded);
  }
  if (permission && !labRoleCan(membership.role, permission)) {
    redirect(labRoutes.home);
  }

  return toMember(user, membership);
}

// For actions that answer with a message instead of redirecting: the active
// member with this permission, or null.
export async function findLabMember(
  permission: LabPermission,
): Promise<LabMember | null> {
  const user = await getSessionUser();
  if (user?.role !== "lab") return null;
  const membership = await getMembership();
  if (membership?.status !== "active") return null;
  if (!labRoleCan(membership.role, permission)) return null;
  return toMember(user, membership);
}

// For pages that show more to some roles than others.
export const memberCan = (member: LabMember, permission: LabPermission) =>
  labRoleCan(member.role, permission);
