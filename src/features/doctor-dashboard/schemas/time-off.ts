import { z } from "zod";

export const timeOffSchema = z
  .object({
    startsOn: z.iso.date("Choose the first day."),
    endsOn: z.iso.date("Choose the last day."),
  })
  .refine(({ startsOn, endsOn }) => endsOn >= startsOn, {
    path: ["endsOn"],
    message: "The last day can't be before the first.",
  });
