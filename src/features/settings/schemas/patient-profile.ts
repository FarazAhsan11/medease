import { z } from "zod";

import { genders } from "@/features/auth/data/registration-options";
import { phoneSchema } from "@/features/auth/schemas/sign-up";

export const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((value) => value || null);

// An empty select or number box means "not given", which the database stores
// as null rather than as a blank value.
const optionalChoice = <const Values extends readonly [string, ...string[]]>(
  values: Values,
  message: string,
) =>
  z
    .string()
    .transform((value) => value || null)
    .pipe(z.enum(values, message).nullable());

const optionalNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number(message).min(min, message).max(max, message).nullable());

// One box per list: items separated by commas or new lines.
const textList = z
  .string()
  .max(3500, "That list is too long.")
  .transform((value) =>
    value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(z.string().max(100, "Keep each item under 100 characters."))
      .max(30, "List 30 items or fewer."),
  );

function isValidBirthDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const oldest = new Date();
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 130);
  return date <= new Date() && date >= oldest;
}

export const patientProfileSchema = z.object({
  firstName: requiredText("Enter your first name.", 60),
  lastName: requiredText("Enter your last name.", 60),
  phone: phoneSchema,
  dateOfBirth: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(
      z.iso
        .date("Enter a valid date.")
        .refine(isValidBirthDate, "Enter your real date of birth.")
        .nullable(),
    ),
  gender: optionalChoice(genders, "Select your gender."),
  bloodGroup: optionalChoice(bloodGroups, "Select your blood group."),
  heightCm: optionalNumber(30, 272, "Enter your height in centimetres."),
  weightKg: optionalNumber(0.5, 500, "Enter your weight in kilograms."),
  allergies: textList,
  chronicConditions: textList,
  currentMedicines: textList,
  homeAddress: optionalText(300),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(phoneSchema.nullable()),
});
