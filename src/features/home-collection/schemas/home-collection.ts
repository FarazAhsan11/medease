import { z } from "zod";

import {
  COLLECTION_SLOT_LENGTHS,
  MAX_AREA_FEE,
  MAX_AREA_NOTE,
  MAX_COLLECTION_RANGES,
  MAX_FREE_ABOVE,
  NOTICE_HOURS,
  SLOT_CAPACITY,
} from "@/features/home-collection/lib/home-collection";
import { cities } from "@/lib/cities";
import { checkWeek, weeklyRangesSchema } from "@/lib/weekly-hours";

const oneOf = (values: readonly number[], message: string) =>
  z.coerce.number().refine((value) => values.includes(value), message);

export const collectionScheduleSchema = z
  .object({
    ranges: weeklyRangesSchema(MAX_COLLECTION_RANGES),
    slotMinutes: oneOf(
      COLLECTION_SLOT_LENGTHS,
      "Pick a slot length from the list.",
    ),
    capacity: z.coerce
      .number("Enter how many visits a slot can take.")
      .int("Enter a whole number.")
      .min(SLOT_CAPACITY.min, "Take at least one visit per slot.")
      .max(SLOT_CAPACITY.max, `Use ${SLOT_CAPACITY.max} or fewer.`),
    noticeHours: oneOf(NOTICE_HOURS, "Pick a notice time from the list."),
    // Blank means the fee always applies.
    freeAbove: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : Number(value)))
      .pipe(
        z
          .number("Enter an amount in rupees.")
          .int("Enter a whole number of rupees.")
          .min(1, "Enter an amount in rupees, or leave it blank.")
          .max(MAX_FREE_ABOVE, "That amount is too high.")
          .nullable(),
      ),
    accepting: z.enum(["true", "false"]).transform((value) => value === "true"),
  })
  .superRefine((data, ctx) => checkWeek(data.ranges, data.slotMinutes, ctx));

export const serviceAreaSchema = z.object({
  id: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
  city: z.enum(cities, "Choose a city from the list."),
  // A blank field is refused rather than read as 0, which would mean free.
  fee: z
    .string()
    .trim()
    .min(1, "Enter a fee in rupees. Use 0 for free.")
    .pipe(z.coerce.number("Enter a fee in rupees."))
    .pipe(
      z
        .number()
        .int("Enter a whole number of rupees.")
        .min(0, "The fee can't be negative. Use 0 for free.")
        .max(
          MAX_AREA_FEE,
          `Keep the fee under Rs ${MAX_AREA_FEE.toLocaleString("en-PK")}.`,
        ),
    ),
  note: z
    .string()
    .trim()
    .max(MAX_AREA_NOTE, `Keep it under ${MAX_AREA_NOTE} characters.`)
    .transform((value) => value.replace(/\s+/g, " ") || null),
});

export const deleteServiceAreaSchema = z.object({ id: z.uuid() });
