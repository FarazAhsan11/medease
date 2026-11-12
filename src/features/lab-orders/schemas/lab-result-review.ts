import { z } from "zod";

import { MAX_RESULT_COMMENT } from "@/features/lab-orders/lib/lab-orders";

// The ordering doctor's review of a report: blank leaves no comment.
export const labResultReviewSchema = z.object({
  bookingId: z.uuid(),
  comment: z
    .string()
    .optional()
    .transform((value) => value?.replace(/\r\n/g, "\n").trim() || null)
    .pipe(
      z
        .string()
        .max(
          MAX_RESULT_COMMENT,
          `Keep the comment under ${MAX_RESULT_COMMENT} characters.`,
        )
        .nullable(),
    ),
});
