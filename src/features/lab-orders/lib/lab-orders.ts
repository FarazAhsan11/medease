import type { Appointment } from "@/features/appointments/lib/appointments";
import type { BookedFor } from "@/features/family/lib/relations";
import { daysBetweenDateKeys, toDateKey } from "@/lib/datetime";
import type { LabBookingStatus } from "@/features/lab-booking/lib/lab-bookings";
import {
  getPrescribeBlock,
  PRESCRIBE_WINDOW_DAYS,
  type PrescribeBlock,
} from "@/features/prescriptions/lib/prescriptions";

// Lab tests the doctor orders at a visit (RX-04), and their bookings and results
// (LAB-08). Design: docs/lab-orders.md.

export const LAB_ORDER_PRIORITIES = ["routine", "urgent"] as const;
export type LabOrderPriority = (typeof LAB_ORDER_PRIORITIES)[number];

export const MAX_ORDER_TESTS = 20;
export const MAX_ORDER_NOTE = 500;
// Match review_lab_result.
export const MAX_RESULT_COMMENT = 1000;

// Orders the patient is still shown under "Ordered by your doctor".
export const RECENT_ORDER_DAYS = 60;

export type LabOrderTest = { id: string; name: string };

export type LabOrder = {
  id: string;
  appointmentId: string;
  careRecipientId: string;
  priority: LabOrderPriority;
  note: string | null;
  status: "active" | "cancelled";
  tests: LabOrderTest[];
  createdAt: string;
  updatedAt: string;
};

export const LAB_ORDER_COLUMNS =
  "id, appointment_id, care_recipient_id, priority, note, status, created_at, updated_at, lab_order_items(test_type_id, test_name)";

export type LabOrderRow = {
  id: string;
  appointment_id: string;
  care_recipient_id: string;
  priority: LabOrderPriority;
  note: string | null;
  status: LabOrder["status"];
  created_at: string;
  updated_at: string;
  lab_order_items: { test_type_id: string; test_name: string }[];
};

export const toLabOrder = (row: LabOrderRow): LabOrder => ({
  id: row.id,
  appointmentId: row.appointment_id,
  careRecipientId: row.care_recipient_id,
  priority: row.priority,
  note: row.note,
  status: row.status,
  tests: row.lab_order_items
    .map((item) => ({ id: item.test_type_id, name: item.test_name }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// A booking made from an order, as the patient sees it: which of the ordered
// tests it covers. Cancelled bookings are left out, so their tests are open.
export type OrderBooking = {
  id: string;
  orderId: string;
  labName: string;
  status: LabBookingStatus;
  testIds: string[];
};

// Ordered tests that a booking holds, which the doctor can't drop.
export const bookedTestIds = (bookings: { testIds: string[] }[]) => [
  ...new Set(bookings.flatMap((booking) => booking.testIds)),
];

// The ordered tests none of these bookings (all from this order, none
// cancelled) covers yet.
export const remainingTests = (
  order: Pick<LabOrder, "tests">,
  bookings: { testIds: string[] }[],
): LabOrderTest[] => {
  const booked = new Set(bookedTestIds(bookings));
  return order.tests.filter((test) => !booked.has(test.id));
};

// A booking from the doctor's order, as the doctor sees it
// (get_lab_order_bookings): no address or payment, the report once
// published, and the doctor's review.
export type OrderResult = {
  bookingId: string;
  labName: string;
  status: LabBookingStatus;
  collection: "lab" | "home";
  visitDate: string;
  slotStartsAt: string | null;
  timezone: string;
  testIds: string[];
  reportId: string | null;
  reportPublishedAt: string | null;
  comment: string | null;
  reviewedAt: string | null;
};

// A report in the doctor's results inbox (PRC-11, get_lab_results_inbox).
export type InboxResult = BookedFor & {
  reportId: string;
  bookingId: string;
  appointmentId: string;
  labName: string;
  collection: "lab" | "home";
  visitDate: string;
  timezone: string;
  priority: LabOrderPriority;
  testNames: string[];
  publishedAt: string;
  version: number;
  reviewedAt: string | null;
  comment: string | null;
};

export const RESULTS_PER_PAGE = 25;

// Where the next page starts: the last row's time and id, in the URL as
// `<iso time>_<report id>`. Ids and times only, never patient data.
export type InboxCursor = { at: string; id: string };

export const inboxCursor = (result: InboxResult, reviewed: boolean) =>
  `${reviewed ? result.reviewedAt : result.publishedAt}_${result.reportId}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseInboxCursor(value: string | undefined) {
  const [at, id] = value?.split("_") ?? [];
  if (!at || !id || !UUID.test(id) || Number.isNaN(Date.parse(at))) {
    return null;
  }
  return { at, id } satisfies InboxCursor;
}

// How long a report has waited for review, in the doctor's calendar days.
// Null on the day it came in, when the published time says enough.
export function waitingLabel(publishedAt: string, timezone: string, now: Date) {
  const days = daysBetweenDateKeys(
    toDateKey(publishedAt, timezone),
    toDateKey(now, timezone),
  );
  if (days <= 0) return null;
  return days === 1 ? "waiting 1 day" : `waiting ${days} days`;
}

// The order's test names, for a booking's test ids.
export const testNames = (order: Pick<LabOrder, "tests">, ids: string[]) =>
  ids.map((id) => order.tests.find((test) => test.id === id)?.name ?? id);

export const priorityLabels: Record<LabOrderPriority, string> = {
  routine: "Routine",
  urgent: "Urgent",
};

export const priorityHints: Record<LabOrderPriority, string> = {
  routine: "In the next few days",
  urgent: "Today or tomorrow",
};

// Same window as a prescription; save_lab_order checks it too.
export const getLabOrderBlock = (
  appointment: Pick<Appointment, "status" | "startsAt">,
  now?: number,
): PrescribeBlock | null => getPrescribeBlock(appointment, now);

export const labOrderBlockMessages: Record<PrescribeBlock, string> = {
  cancelled: "This appointment was cancelled, so it has no lab tests.",
  no_show: "This appointment was marked as a no-show, so it has no lab tests.",
  not_started:
    "You can order lab tests once the appointment has started, during or after the call.",
  window_closed: `Lab tests can be ordered or changed up to ${PRESCRIBE_WINDOW_DAYS} days after the appointment.`,
};

export const labOrderErrorMessages: Record<string, string> = {
  not_doctor: "Only doctors can order lab tests.",
  appointment_not_found: "We couldn't find that appointment.",
  appointment_cancelled: labOrderBlockMessages.cancelled,
  appointment_no_show: labOrderBlockMessages.no_show,
  lab_order_not_started: labOrderBlockMessages.not_started,
  lab_order_window_closed: labOrderBlockMessages.window_closed,
  lab_order_not_found: "There's no lab order for this appointment.",
  lab_order_test_booked:
    "The patient has booked some of these tests, so they can't be removed. You can still add tests or change the priority and note.",
  lab_order_booked:
    "The patient has booked these tests, so the order can't be cancelled. They can cancel the booking if the tests are no longer needed.",
  invalid_lab_order: `Check the order: choose 1 to ${MAX_ORDER_TESTS} tests and keep the note under ${MAX_ORDER_NOTE} characters.`,
};

export const labResultErrorMessages: Record<string, string> = {
  not_doctor: "Only the doctor who ordered the tests can review the result.",
  booking_not_found: "We couldn't find that result.",
  report_not_ready: "The lab hasn't published the report yet.",
  invalid_comment: `Keep the comment under ${MAX_RESULT_COMMENT} characters.`,
};
