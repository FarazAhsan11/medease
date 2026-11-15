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

// What prints on a signed report. The stamp uses a standard PDF font, so
// English letters and accents only (the database checks the same).
const printable = /^[ -~ -ÿ]*$/;
const PRINTABLE_MESSAGE = "Use English letters, as it should print on reports.";

export const labSignerSchema = labStaffMemberSchema
  .extend({
    signerName: z
      .string()
      .trim()
      .max(80, "Use 80 characters or fewer.")
      .regex(printable, PRINTABLE_MESSAGE),
    signerTitle: z
      .string()
      .trim()
      .max(120, "Use 120 characters or fewer.")
      .regex(printable, PRINTABLE_MESSAGE),
    clear: z.literal("1").optional(),
  })
  .superRefine((value, context) => {
    if (value.clear) return;
    if (value.signerName.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["signerName"],
        message: "Enter their name as it should print, e.g. Dr Ayesha Khan.",
      });
    }
    if (value.signerTitle.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["signerTitle"],
        message: "Enter their qualification, e.g. MBBS, FCPS (Haematology).",
      });
    }
  });
