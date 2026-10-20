import { z } from "zod";

import {
  DOSE_TIMES,
  FREQUENCIES,
  MAX_PRESCRIPTION_ITEMS,
  MEAL_TIMINGS,
  MEDICINE_FORMS,
} from "@/features/prescriptions/lib/prescriptions";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

// One medicine row. Also used by the form to check rows before sending.
export const prescriptionItemSchema = z
  .object({
    medicine: z
      .string()
      .trim()
      .min(1, "Enter the medicine name.")
      .max(100, "Keep the name under 100 characters."),
    strength: optionalText(40, "Keep the strength under 40 characters."),
    form: z.enum(MEDICINE_FORMS, "Pick the medicine form."),
    dose: z
      .string()
      .trim()
      .min(1, "Enter the dose, e.g. 1 tablet.")
      .max(40, "Keep the dose under 40 characters."),
    frequency: z.enum(FREQUENCIES, "Pick how often."),
    doseTimes: z.array(z.enum(DOSE_TIMES)).max(DOSE_TIMES.length),
    meal: z.enum(MEAL_TIMINGS, "Pick when to take it."),
    durationDays: z
      .number("Enter the number of days.")
      .int("Enter whole days.")
      .min(1, "At least 1 day.")
      .max(365, "At most 365 days. Leave empty if ongoing.")
      .nullable(),
    instructions: optionalText(300, "Keep instructions under 300 characters."),
  })
  .refine(
    (item) => item.frequency === "as_needed" || item.doseTimes.length > 0,
    { message: "Pick at least one time of day.", path: ["doseTimes"] },
  )
  .transform((item) => ({
    ...item,
    // Once each, in day order; none for "as needed".
    doseTimes:
      item.frequency === "as_needed"
        ? []
        : DOSE_TIMES.filter((time) => item.doseTimes.includes(time)),
  }));

export const prescriptionItemsSchema = z
  .array(prescriptionItemSchema)
  .min(1, "Add at least one medicine.")
  .max(
    MAX_PRESCRIPTION_ITEMS,
    `A prescription can have up to ${MAX_PRESCRIPTION_ITEMS} medicines.`,
  );

export const issuePrescriptionSchema = z.object({
  appointmentId: z.uuid(),
  // The active version being edited; empty for a new prescription.
  replacesId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((value) => value || null),
  diagnosis: optionalText(200, "Keep the diagnosis under 200 characters."),
  advice: optionalText(1000, "Keep the advice under 1,000 characters."),
  // The rows arrive as JSON in one hidden field.
  items: z
    .string()
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({
          code: "custom",
          message: "Add at least one medicine.",
        });
        return z.NEVER;
      }
    })
    .pipe(prescriptionItemsSchema),
});

export const cancelPrescriptionSchema = z.object({
  prescriptionId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Tell the patient why you're cancelling it.")
    .max(500, "Keep the reason under 500 characters."),
});
