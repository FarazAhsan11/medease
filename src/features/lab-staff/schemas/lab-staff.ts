import { z } from "zod";

import { emailSchema } from "@/features/auth/schemas/sign-in";
import { labStaffRoles } from "@/features/lab-staff/lib/lab-permissions";

const roleSchema = z.enum(labStaffRoles, { error: "Choose a role." });

export const inviteLabStaffSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter their name.")
    .max(120, "Use 120 characters or fewer."),
  email: emailSchema,
  role: roleSchema,
});

export const labStaffMemberSchema = z.object({ userId: z.uuid() });

export const changeLabStaffRoleSchema = labStaffMemberSchema.extend({
  role: roleSchema,
});
