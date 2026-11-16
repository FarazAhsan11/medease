import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import {
  sampleTypeLabels,
  sampleTypes,
  type SampleType,
} from "@/features/lab-samples/lib/samples";
import { labMemberRoleSchema } from "@/features/lab-staff/lib/lab-permissions";
import { z } from "zod";

// The collector's day view and cash (LAB-21); see docs/home-collection.md,
// "Collector's day view".

// A home visit on the collector's list, with the containers its tests need.
export type CollectionVisit = {
  booking: LabBooking;
  sampleTypes: SampleType[];
};

// Cash is taken on a cash booking that isn't paid or cancelled. The database
// checks the same.
export const takesCash = (
  booking: Pick<LabBooking, "paymentMethod" | "paymentStatus" | "status">,
) =>
  booking.paymentMethod === "cash" &&
  booking.paymentStatus === "unpaid" &&
  booking.status !== "cancelled" &&
  booking.status !== "awaiting_payment";

// Every container type the items need, in the usual order.
export function containersFor(itemSampleTypes: (string[] | null)[]) {
  const needed = new Set(itemSampleTypes.flat());
  return sampleTypes.filter((type) => needed.has(type));
}

export const containersLabel = (types: SampleType[]) =>
  types.map((type) => sampleTypeLabels[type]).join(", ");

// A Google Maps search for the address: no API key, and it opens the Maps app
// on phones. Only the address goes, and only when the collector taps.
export function mapsHref(address: NonNullable<LabBooking["address"]>) {
  const query = [address.streetAddress, address.area, address.city, "Pakistan"]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// One person's line in the day's summary, as get_lab_cash_summary returns it.
export const cashSummaryRowSchema = z.object({
  user_id: z.uuid().nullable(),
  full_name: z.string().nullable(),
  role: labMemberRoleSchema.nullable(),
  visits: z.number().int(),
  collected: z.number().int(),
  cash_count: z.number().int(),
  // bigint comes back as a number or a string.
  cash_total: z.coerce.number(),
});

export type CashSummaryRow = z.infer<typeof cashSummaryRowSchema>;

export const cashErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can record cash.",
  not_permitted: "Your role in this lab doesn't take samples or cash.",
  second_factor_required: "Confirm your two-factor sign-in first.",
  booking_not_found: "This booking isn't in your list.",
  not_cash: "This booking was paid online, so there's no cash to take.",
  not_payable: "This booking was cancelled, so no cash is taken.",
  already_paid: "Cash for this booking is already recorded.",
  amount_changed:
    "The amount due has changed. Reload the page and check it with the patient.",
  status_changed: "Someone else updated this booking. The page now shows where it is.",
  invalid_move: "This booking can't be marked collected now.",
  too_early: "The sample can be marked collected from the booked day.",
};

// Codes meaning our copy of the booking is stale: reload to show it.
export const staleCashCodes = new Set([
  "status_changed",
  "already_paid",
  "amount_changed",
  "not_payable",
]);
