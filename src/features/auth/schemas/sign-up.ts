import { z } from "zod";

import {
  genders,
  labServices,
  specializations,
} from "@/features/auth/data/registration-options";
import { newPasswordSchema } from "@/features/auth/schemas/password";
import { emailSchema } from "@/features/auth/schemas/sign-in";
import type { FormState } from "@/lib/form-state";

const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer.`);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s-]{7,20}$/, "Enter a valid phone number.");

const accountSchema = z.object({
  firstName: requiredText("Enter your first name.", 60),
  lastName: requiredText("Enter your last name.", 60),
  email: emailSchema,
  phone: phoneSchema,
  password: newPasswordSchema,
});

export const patientSignUpSchema = accountSchema;

export const doctorSignUpSchema = accountSchema.extend({
  age: z.coerce
    .number<string>()
    .int("Enter a whole number.")
    .min(21, "Enter an age between 21 and 100.")
    .max(100, "Enter an age between 21 and 100."),
  gender: z.enum(genders, "Select your gender."),
  specialization: z.enum(specializations, "Select your specialization."),
  licenseNumber: requiredText("Enter your license number.", 40),
  address: requiredText("Enter your clinic address.", 300),
});

export const labSignUpSchema = z.object({
  labName: requiredText("Enter your laboratory's name.", 120),
  registrationNumber: requiredText("Enter your registration number.", 40),
  contactPerson: requiredText("Enter a contact person.", 120),
  email: emailSchema,
  phone: phoneSchema,
  address: requiredText("Enter your lab's address.", 300),
  services: z.array(z.enum(labServices)),
  password: newPasswordSchema,
});

// `confirmEmail` is set when the account needs email confirmation first.
export type SignUpState = FormState & { confirmEmail?: string };
