import { z } from "zod";

import {
  MAX_ADVICE,
  MAX_DIAGNOSIS,
} from "@/features/visit-summaries/lib/visit-summaries";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

export const visitSummarySchema = z
  .object({
    appointmentId: z.uuid(),
    diagnosis: optionalText(
      MAX_DIAGNOSIS,
      `Keep the diagnosis under ${MAX_DIAGNOSIS} characters.`,
    ),
    advice: optionalText(
      MAX_ADVICE,
      `Keep the advice under ${MAX_ADVICE.toLocaleString("en")} characters.`,
    ),
    followUpOn: z
      .union([z.iso.date("Pick a valid date."), z.literal("")])
      .optional()
      .transform((value) => value || null),
  })
  .refine(
    (summary) => summary.diagnosis || summary.advice || summary.followUpOn,
    {
      message: "Add a diagnosis, advice or a follow-up date.",
      path: ["diagnosis"],
    },
  );
