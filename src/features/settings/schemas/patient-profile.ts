import { z } from "zod";

import { phoneSchema } from "@/features/auth/schemas/sign-up";
import {
  birthDateSchema,
  medicalProfileShape,
  optionalText,
  requiredText,
} from "@/features/medical-profile/schemas/medical-profile";

export const patientProfileSchema = z.object({
  firstName: requiredText("Enter your first name.", 60),
  lastName: requiredText("Enter your last name.", 60),
  phone: phoneSchema,
  dateOfBirth: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(birthDateSchema.nullable()),
  ...medicalProfileShape,
  homeAddress: optionalText(300),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(phoneSchema.nullable()),
});
