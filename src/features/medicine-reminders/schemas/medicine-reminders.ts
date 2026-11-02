import { z } from "zod";

import { isTimezone } from "../lib/medicine-reminders";

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time.");

export const medicineRemindersSchema = z
  .object({
    // A switch sends its name only when it's on.
    enabled: z
      .literal("on")
      .optional()
      .transform((value) => value === "on"),
    morning: clockTime,
    afternoon: clockTime,
    night: clockTime,
    timezone: z.string().refine(isTimezone, "Choose a time zone."),
  })
  .refine(({ morning, afternoon }) => morning < afternoon, {
    path: ["afternoon"],
    message: "Choose a time after the morning one.",
  })
  .refine(({ afternoon, night }) => afternoon < night, {
    path: ["night"],
    message: "Choose a time after the afternoon one.",
  });
