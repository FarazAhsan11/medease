import "server-only";

import { z } from "zod";

import { labMemberRoleSchema } from "@/features/lab-staff/lib/lab-permissions";
import type { LabStaffMember } from "@/features/lab-staff/lib/lab-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const rowSchema = z.object({
  user_id: z.uuid(),
  full_name: z.string().nullable(),
  email: z.string().nullable(),
  role: labMemberRoleSchema,
  status: z.enum(["invited", "active"]),
  invited_at: z.string(),
  activated_at: z.string().nullable(),
  invite_expires_at: z.string().nullable(),
});

// The lab's people, admin first. get_lab_staff checks the caller is the
// admin, with their own session.
export async function getLabStaff(): Promise<LabStaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_staff");
  if (error) throw new Error(`get_lab_staff: ${error.message}`);

  return z
    .array(rowSchema)
    .parse(data)
    .map((row) => ({
      userId: row.user_id,
      name: row.full_name ?? row.email ?? "",
      email: row.email ?? "",
      role: row.role,
      status: row.status,
      invitedAt: row.invited_at,
      activatedAt: row.activated_at,
      inviteExpiresAt: row.invite_expires_at,
    }));
}

// One person on the lab's list, for actions that need their name and email.
export async function getLabStaffMember(userId: string) {
  return (await getLabStaff()).find((member) => member.userId === userId);
}

const inviteSchema = z.object({
  role: labMemberRoleSchema,
  lab: z.object({ lab_name: z.string() }),
});

// What the invitation page shows. Called only once the emailed token has
// checked out, which is the permission to read this one row.
export async function getLabInviteDetails(userId: string) {
  const { data, error } = await createAdminClient()
    .from("lab_members")
    .select("role, lab:lab_profiles(lab_name)")
    .eq("user_id", userId)
    .eq("status", "invited")
    .maybeSingle();
  if (error) throw new Error(`lab_members: ${error.message}`);
  if (!data) return null;

  const invite = inviteSchema.parse(data);
  return { role: invite.role, labName: invite.lab.lab_name };
}
