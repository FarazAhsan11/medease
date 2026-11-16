import { z } from "zod";

const amount = z.coerce
  .number()
  .int()
  .positive("The amount must be more than zero.");

// Marking a home visit collected, with the cash when it was taken.
export const collectVisitSchema = z.object({
  bookingId: z.uuid(),
  fromStatus: z.enum(["booked", "recollection_needed"]),
  // "on" when the box is ticked; the amount comes with it.
  cashTaken: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
  amount: amount.optional(),
}).refine((value) => !value.cashTaken || value.amount !== undefined, {
  message: "Say how much cash you took.",
  path: ["amount"],
});

// Cash taken without a collection: at the counter, or caught up later.
export const recordCashSchema = z.object({
  bookingId: z.uuid(),
  amount,
});
