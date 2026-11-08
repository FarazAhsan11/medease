import { z } from "zod";

import { SLOT_LENGTHS } from "@/features/doctor-dashboard/lib/schedule";
import { checkWeek, weeklyRangesSchema } from "@/lib/weekly-hours";

export const scheduleSchema = z
  .object({
    ranges: weeklyRangesSchema(28),
    slotMinutes: z.coerce
      .number()
      .refine(
        (value) => (SLOT_LENGTHS as readonly number[]).includes(value),
        "Pick a slot length from the list.",
      ),
    accepting: z.enum(["true", "false"]).transform((value) => value === "true"),
    fee: z.coerce
      .number("Enter a fee in PKR.")
      .int("Enter a whole number.")
      .min(0, "The fee can't be negative.")
      .max(1_000_000, "That fee is too high."),
  })
  .superRefine((data, ctx) => checkWeek(data.ranges, data.slotMinutes, ctx));
