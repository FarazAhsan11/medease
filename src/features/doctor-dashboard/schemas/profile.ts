import { z } from "zod";

import {
  genders,
  specializations,
} from "@/features/auth/data/registration-options";

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(max, `Use ${max} characters or fewer.`);

export const doctorProfileSchema = z.object({
  firstName: text("first name", 60),
  lastName: text("last name", 60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, "Enter a valid phone number."),
  age: z.coerce
    .number<string>()
    .int("Enter a whole number.")
    .min(21, "Enter an age between 21 and 100.")
    .max(100, "Enter an age between 21 and 100."),
  gender: z.enum(genders, "Select your gender."),
  specialization: z.enum(specializations, "Select your specialization."),
  experienceYears: z.coerce
    .number<string>()
    .int("Enter a whole number.")
    .min(0, "Enter 0 or more.")
    .max(70, "That seems too high."),
  city: text("city", 80),
  clinicAddress: text("clinic address", 300),
  bio: z
    .string()
    .trim()
    .max(1000, "Keep your bio under 1,000 characters.")
    .transform((value) => value || null),
});
