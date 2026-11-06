import { z } from "zod";

import { familyRelations } from "@/features/family/lib/relations";
import {
  birthDateSchema,
  medicalProfileShape,
  requiredText,
} from "@/features/medical-profile/schemas/medical-profile";

export const familyMemberSchema = z.object({
  id: z
    .string()
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
  firstName: requiredText("Enter their first name.", 60),
  lastName: requiredText("Enter their last name.", 60),
  relation: z.enum(familyRelations, "Select how they're related to you."),
  // Doctors need an age to dose medicines, children's especially.
  dateOfBirth: z
    .string()
    .trim()
    .min(1, "Enter their date of birth.")
    .pipe(birthDateSchema),
  ...medicalProfileShape,
});

export const deleteFamilyMemberSchema = z.object({ id: z.uuid() });
