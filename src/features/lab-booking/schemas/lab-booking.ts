import { z } from "zod";

import {
  cancelReasons,
  labBookingStatuses,
  MAX_BOOKING_ITEMS,
  MAX_STATUS_NOTE,
  patientCancelReasons,
  paymentMethods,
  recollectionReasons,
} from "@/features/lab-booking/lib/lab-bookings";

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
    // The doctor's order the page was opened from, if any (LAB-08).
    labOrderId: optionalId("That order can't be found."),
    // Cash when online payment is off and the choice isn't shown.
    paymentMethod: z
      .enum(paymentMethods, "Choose how to pay.")
      .optional()
      .default("cash"),
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

const statusNote = z
  .string()
  .optional()
  .transform((value) => value?.replace(/\r\n/g, "\n").trim() || null)
  .pipe(
    z
      .string()
      .max(
        MAX_STATUS_NOTE,
        `Keep the note under ${MAX_STATUS_NOTE} characters.`,
      )
      .nullable(),
  );

// A lab moving a booking on (LAB-04). The database checks the move itself.
export const moveLabBookingSchema = z
  .object({
    bookingId: z.uuid(),
    fromStatus: z.enum(labBookingStatuses),
    toStatus: z.enum(labBookingStatuses),
    reason: z
      .string()
      .optional()
      .transform((value) => value || null)
      .pipe(
        z
          .enum([...recollectionReasons, ...cancelReasons], "Choose a reason.")
          .nullable(),
      ),
    note: statusNote,
  })
  .superRefine((value, context) => {
    const needsReason =
      value.toStatus === "recollection_needed" ||
      value.toStatus === "cancelled";
    if (needsReason && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Choose a reason.",
      });
    }
    if (value.reason === "other" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Add a note saying what happened.",
      });
    }
  });

// The patient cancelling a booking (LAB-20). "Other" needs a note, so the lab
// learns why.
export const cancelLabBookingSchema = z
  .object({
    bookingId: z.uuid(),
    reason: z.enum(patientCancelReasons, "Choose a reason."),
    note: statusNote,
  })
  .superRefine((value, context) => {
    if (value.reason === "other" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Add a note for the lab saying why.",
      });
    }
  });

// The patient moving a booking to a new day (lab visit) or window (home
// collection).
export const rescheduleLabBookingSchema = z
  .object({
    bookingId: z.uuid(),
    collection: z.enum(["lab", "home"]),
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
  })
  .superRefine((value, context) => {
    if (value.collection === "lab" && !value.visitDate) {
      context.addIssue({
        code: "custom",
        path: ["visitDate"],
        message: "Pick a day for your visit.",
      });
    }
    if (value.collection === "home" && !value.slotStartsAt) {
      context.addIssue({
        code: "custom",
        path: ["slotStartsAt"],
        message: "Pick a collection window.",
      });
    }
  });

export const payLabBookingSchema = z.object({
  bookingId: z.uuid(),
});
