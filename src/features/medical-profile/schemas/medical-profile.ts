import { z } from "zod";

import { genders } from "@/features/auth/data/registration-options";

// Field rules shared by the account holder's profile and family members'.

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

export const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer.`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((value) => value || null);

// An empty select or number box means "not given", which the database stores
// as null rather than as a blank value.
export const optionalChoice = <
  const Values extends readonly [string, ...string[]],
>(
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

export function isValidBirthDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const oldest = new Date();
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 130);
  return date <= new Date() && date >= oldest;
}

export const birthDateSchema = z.iso
  .date("Enter a valid date.")
  .refine(isValidBirthDate, "Enter a real date of birth.");

export const medicalProfileShape = {
  gender: optionalChoice(genders, "Select a gender."),
  bloodGroup: optionalChoice(bloodGroups, "Select a blood group."),
  heightCm: optionalNumber(30, 272, "Enter the height in centimetres."),
  weightKg: optionalNumber(0.5, 500, "Enter the weight in kilograms."),
  allergies: textList,
  chronicConditions: textList,
  currentMedicines: textList,
};
