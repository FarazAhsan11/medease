import { z } from "zod";

import { MAX_BOOKING_ITEMS } from "@/features/lab-booking/lib/lab-bookings";

const optionalId = (message: string) =>
  z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.uuid(message).nullable());

const ids = z.array(z.uuid("Choose tests from the list."));

export const bookLabTestSchema = z
  .object({
    requestId: z.uuid(),
    labId: z.uuid(),
    labTestIds: ids,
    packageIds: ids,
    collection: z.enum(
      ["lab", "home"],
      "Choose a lab visit or home collection.",
    ),
    visitDate: z
      .string()
      .optional()
      .transform((value) => value || null)
      .pipe(z.iso.date("Pick a day for your visit.").nullable()),
    slotStartsAt: z
      .string()
      .optional()
      .transform((value) => value || null)
      .pipe(
        z.iso
          .datetime({ offset: true, message: "Pick a collection window." })
          .nullable(),
      ),
    addressId: optionalId("Choose an address."),
    // Empty means the account holder; otherwise one of their family members.
    careRecipientId: optionalId("Choose who the test is for."),
  })
  .superRefine((value, context) => {
    const count = value.labTestIds.length + value.packageIds.length;
    if (count < 1 || count > MAX_BOOKING_ITEMS) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: `Choose between 1 and ${MAX_BOOKING_ITEMS} tests or packages.`,
      });
    }
    if (value.collection === "lab" && !value.visitDate) {
      context.addIssue({
        code: "custom",
        path: ["visitDate"],
        message: "Pick a day for your visit.",
      });
    }
    if (value.collection === "home") {
      if (!value.addressId) {
        context.addIssue({
          code: "custom",
          path: ["addressId"],
          message: "Choose where to collect the sample.",
        });
      }
      if (!value.slotStartsAt) {
        context.addIssue({
          code: "custom",
          path: ["slotStartsAt"],
          message: "Pick a collection window.",
        });
      }
    }
  });
