import { z } from "zod";

import {
  findDayProblem,
  SLOT_LENGTHS,
  toWeekSchedule,
} from "@/features/doctor-dashboard/lib/schedule";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time like 09:30.");

export const scheduleSchema = z
  .object({
    ranges: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          start: time,
          end: time,
        }),
      )
      .max(28, "That's too many time ranges."),
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
  .superRefine((data, ctx) => {
    const schedule = toWeekSchedule(data.ranges);
    for (const ranges of Object.values(schedule)) {
      const problem = findDayProblem(ranges, data.slotMinutes);
      if (problem) {
        ctx.addIssue({ code: "custom", path: ["ranges"], message: problem });
        return;
      }
    }
  });
