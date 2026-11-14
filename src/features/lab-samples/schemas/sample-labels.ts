import { z } from "zod";

export const sampleLabelsSchema = z.object({
  bookingId: z.uuid(),
});
