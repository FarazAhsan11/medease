// Lab bookings (LAB-03), their status moves (LAB-04), reports (LAB-05) and
// the patient's changes (LAB-20).
// Safe to import from client components.
// Design: docs/lab-booking.md.

import type { CareRecipientRelation } from "@/features/family/lib/relations";
import { formatDate, formatDateTime, formatTime } from "@/lib/datetime";

// Match book_lab_test.
export const MAX_BOOKING_ITEMS = 20;
export const VISIT_WINDOW_DAYS = 14;
// Every city labs collect in is in Pakistan (docs/home-collection.md).
export const LAB_TIMEZONE = "Asia/Karachi";

export const labBookingStatuses = [
  "booked",
  "sample_collected",
  "processing",
  "report_ready",
  "cancelled",
  "recollection_needed",
] as const;

export type LabBookingStatus = (typeof labBookingStatuses)[number];

export const statusLabels: Record<LabBookingStatus, string> = {
  booked: "Booked",
  sample_collected: "Sample collected",
  processing: "Processing",
  report_ready: "Report ready",
  cancelled: "Cancelled",
  recollection_needed: "New sample needed",
};

// The steps a booking moves through, in order, for the progress tracker.
export const progressSteps = [
  "booked",
  "sample_collected",
  "processing",
  "report_ready",
] as const satisfies readonly LabBookingStatus[];

// The moves a lab can make from each status. Match move_lab_booking; report
// ready comes only with the report (publish_lab_report).
export const nextStatuses: Record<LabBookingStatus, LabBookingStatus[]> = {
  booked: ["sample_collected", "cancelled"],
  recollection_needed: ["sample_collected", "cancelled"],
  sample_collected: ["processing", "recollection_needed", "cancelled"],
  processing: ["report_ready", "recollection_needed", "cancelled"],
  report_ready: [],
  cancelled: [],
};

// The lab's working lists.
export const labBookingStages = ["to-collect", "in-lab", "finished"] as const;
export type LabBookingStage = (typeof labBookingStages)[number];

export const stageStatuses: Record<LabBookingStage, LabBookingStatus[]> = {
  "to-collect": ["booked", "recollection_needed"],
  "in-lab": ["sample_collected", "processing"],
  finished: ["report_ready", "cancelled"],
};

export const stageLabels: Record<LabBookingStage, string> = {
  "to-collect": "To collect",
  "in-lab": "In the lab",
  finished: "Finished",
};

// The forward step's button.
export const forwardLabels: Partial<Record<LabBookingStatus, string>> = {
  sample_collected: "Sample collected",
  processing: "Start processing",
};

export const recollectionReasons = [
  "sample_haemolysed",
  "sample_clotted",
  "not_enough_sample",
  "label_problem",
  "sample_delayed",
  "other",
] as const;

export const cancelReasons = [
  "patient_request",
  "patient_unreachable",
  "patient_absent",
  "test_unavailable",
  "collection_unavailable",
  "other",
] as const;

// The patient's own reasons for cancelling. Match the table's check.
export const patientCancelReasons = [
  "no_longer_needed",
  "booked_by_mistake",
  "another_lab",
  "time_unsuitable",
  "other",
] as const;

export type StatusReason =
  | (typeof recollectionReasons)[number]
  | (typeof cancelReasons)[number]
  | (typeof patientCancelReasons)[number];

// Shown to the lab and the patient alike, so worded for the patient.
export const reasonLabels: Record<StatusReason, string> = {
  sample_haemolysed: "The sample was damaged (haemolysed)",
  sample_clotted: "The sample clotted",
  not_enough_sample: "There wasn't enough sample",
  label_problem: "The sample label couldn't be matched",
  sample_delayed: "The sample took too long to reach the lab",
  patient_request: "Cancelled at the patient's request",
  patient_unreachable: "The lab couldn't reach the patient",
  patient_absent: "Nobody was there for the visit or collection",
  test_unavailable: "The lab can't run this test right now",
  collection_unavailable: "The lab couldn't send a collector",
  no_longer_needed: "The test is no longer needed",
  booked_by_mistake: "Booked by mistake",
  another_lab: "Going to another lab",
  time_unsuitable: "None of the times suit",
  other: "Other",
};

// The patient can cancel or move a booking until the sample is taken, and
// move it up to MAX_RESCHEDULES times. Match cancel_lab_booking and
// reschedule_lab_booking.
export const MAX_RESCHEDULES = 3;
export const patientChangeableStatuses: LabBookingStatus[] = [
  "booked",
  "recollection_needed",
];

export const canPatientChange = (booking: Pick<LabBooking, "status">) =>
  patientChangeableStatuses.includes(booking.status);

export const canReschedule = (
  booking: Pick<LabBooking, "status" | "rescheduleCount">,
) => canPatientChange(booking) && booking.rescheduleCount < MAX_RESCHEDULES;

export const MAX_STATUS_NOTE = 500;

// A test or package the patient can add to a booking.
export type BookableItem = {
  // "test:<lab test id>" or "package:<package id>"
  key: string;
  id: string;
  kind: "test" | "package";
  name: string;
  price: number;
  turnaroundHours: number;
  homeCollection: boolean;
  // The test itself, or every test in the package: no test twice per booking.
  testNames: string[];
};

export const itemKey = (kind: BookableItem["kind"], id: string) =>
  `${kind}:${id}`;

// The tests that appear more than once across the chosen items.
export function repeatedTests(items: BookableItem[]) {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const name of items.flatMap((item) => item.testNames)) {
    if (seen.has(name)) repeated.add(name);
    seen.add(name);
  }
  return [...repeated];
}

export type CollectionArea = { city: string; fee: number; note: string | null };

// The city's fee, waived when the order reaches the lab's free-above amount.
export function collectionFee(
  subtotal: number,
  area: CollectionArea,
  freeAbove: number | null,
) {
  return freeAbove !== null && subtotal >= freeAbove ? 0 : area.fee;
}

export type LabBookingItem = {
  id: string;
  name: string;
  price: number;
  testNames: string[];
  isPackage: boolean;
};

// Cash only until online payment (PAY-07).
export type PaymentMethod = "cash";
export type PaymentStatus = "unpaid" | "paid";

export const paymentLabels: Record<PaymentMethod | PaymentStatus, string> = {
  cash: "Cash",
  unpaid: "unpaid",
  paid: "paid",
};

export type LabBooking = {
  id: string;
  labId: string;
  status: LabBookingStatus;
  collection: "lab" | "home";
  visitDate: string;
  slotStartsAt: string | null;
  slotEndsAt: string | null;
  timezone: string;
  labName: string;
  labAddress: string;
  labPhone: string;
  patientName: string;
  patientPhone: string | null;
  careRecipientName: string;
  careRecipientRelation: CareRecipientRelation;
  careRecipientDateOfBirth: string | null;
  careRecipientGender: string | null;
  address: {
    streetAddress: string;
    area: string;
    city: string;
    landmark: string | null;
    contactName: string | null;
    contactPhone: string;
  } | null;
  subtotal: number;
  collectionFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  statusReason: StatusReason | null;
  statusNote: string | null;
  statusChangedAt: string;
  // Who cancelled, once cancelled.
  cancelledBy: "patient" | "lab" | null;
  // Times the patient moved it to a new day or window.
  rescheduleCount: number;
  createdAt: string;
  items: LabBookingItem[];
  // The current report, once the lab has published one (LAB-05).
  reportId: string | null;
  // When each step happened, newest move per status. Only on the patient's
  // list, which shows the tracker.
  steps: Partial<Record<LabBookingStatus, string>>;
};

export type LabBookingRow = {
  id: string;
  lab_id: string;
  status: LabBookingStatus;
  collection: "lab" | "home";
  visit_date: string;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  timezone: string;
  lab_name: string;
  lab_address: string;
  lab_phone: string;
  patient_name: string;
  patient_phone: string | null;
  care_recipient_name: string;
  care_recipient_relation: CareRecipientRelation;
  care_recipient_date_of_birth: string | null;
  care_recipient_gender: string | null;
  street_address: string | null;
  area: string | null;
  city: string | null;
  landmark: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  subtotal: number;
  collection_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status_reason: StatusReason | null;
  status_note: string | null;
  status_changed_at: string;
  cancelled_by: "patient" | "lab" | null;
  reschedule_count: number;
  created_at: string;
  lab_booking_events?: {
    status: LabBookingStatus;
    kind: "status" | "rescheduled";
    created_at: string;
  }[];
  lab_reports: { id: string; replaced_at: string | null }[];
  lab_booking_items: {
    id: string;
    name: string;
    price: number;
    test_names: string[];
    package_id: string | null;
  }[];
};

export const LAB_BOOKING_COLUMNS = `id, lab_id, status, collection, visit_date, slot_starts_at, slot_ends_at, timezone,
  lab_name, lab_address, lab_phone, patient_name, patient_phone, care_recipient_name,
  care_recipient_relation, care_recipient_date_of_birth, care_recipient_gender,
  street_address, area, city, landmark, contact_name, contact_phone, subtotal,
  collection_fee, total, payment_method, payment_status, status_reason,
  status_note, status_changed_at, cancelled_by, reschedule_count, created_at,
  lab_booking_items (id, name, price, test_names, package_id),
  lab_reports (id, replaced_at)`;

export const LAB_BOOKING_WITH_STEPS_COLUMNS = `${LAB_BOOKING_COLUMNS},
  lab_booking_events (status, kind, created_at)`;

// The newest time each status was reached. A move to a new time isn't a step.
function stepTimes(events: LabBookingRow["lab_booking_events"]) {
  const steps: Partial<Record<LabBookingStatus, string>> = {};
  for (const event of events ?? []) {
    if (event.kind !== "status") continue;
    const seen = steps[event.status];
    if (!seen || seen < event.created_at)
      steps[event.status] = event.created_at;
  }
  return steps;
}

export function toLabBooking(row: LabBookingRow): LabBooking {
  return {
    id: row.id,
    labId: row.lab_id,
    status: row.status,
    collection: row.collection,
    visitDate: row.visit_date,
    slotStartsAt: row.slot_starts_at,
    slotEndsAt: row.slot_ends_at,
    timezone: row.timezone,
    labName: row.lab_name,
    labAddress: row.lab_address,
    labPhone: row.lab_phone,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    careRecipientName: row.care_recipient_name,
    careRecipientRelation: row.care_recipient_relation,
    careRecipientDateOfBirth: row.care_recipient_date_of_birth,
    careRecipientGender: row.care_recipient_gender,
    address:
      row.street_address && row.area && row.city && row.contact_phone
        ? {
            streetAddress: row.street_address,
            area: row.area,
            city: row.city,
            landmark: row.landmark,
            contactName: row.contact_name,
            contactPhone: row.contact_phone,
          }
        : null,
    subtotal: row.subtotal,
    collectionFee: row.collection_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    statusReason: row.status_reason,
    statusNote: row.status_note,
    statusChangedAt: row.status_changed_at,
    cancelledBy: row.cancelled_by,
    rescheduleCount: row.reschedule_count,
    createdAt: row.created_at,
    steps: stepTimes(row.lab_booking_events),
    reportId:
      row.lab_reports.find((report) => report.replaced_at === null)?.id ?? null,
    items: [...row.lab_booking_items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        testNames: item.test_names,
        isPackage: item.package_id !== null,
      })),
  };
}

// "CBC, HbA1c and 2 more"
export function itemsSummary(items: { name: string }[], shown = 2) {
  const names = items.slice(0, shown).map((item) => item.name);
  const more = items.length - names.length;
  return more > 0 ? `${names.join(", ")} and ${more} more` : names.join(", ");
}

// Whole years on the visit day, for the lab's reference ranges.
export function ageOn(dateOfBirth: string, onDate: string) {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [y, m, d] = onDate.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export const labBookingErrorMessages: Record<string, string> = {
  not_patient: "Only patient accounts can book lab tests.",
  invalid_booking: "Some of these details aren't valid. Please check them.",
  invalid_items: `Choose between 1 and ${MAX_BOOKING_ITEMS} tests or packages.`,
  invalid_care_recipient:
    "That family member is no longer on your account. Choose someone else.",
  lab_not_found: "This lab isn't taking bookings on MedEase right now.",
  item_unavailable:
    "One of these tests is no longer offered by this lab. Reload the page and choose again.",
  duplicate_test:
    "A test is in your booking twice, on its own and in a package. Remove one.",
  too_many_bookings:
    "You have 20 open lab bookings. Wait for some to finish before booking more.",
  invalid_visit_date: "Choose a day in the next two weeks.",
  not_collecting:
    "This lab has stopped home collection. Choose a lab visit instead.",
  no_home_collection:
    "One of these tests can't be collected at home. Remove it or choose a lab visit.",
  invalid_address:
    "That address is no longer on your account. Choose another one.",
  area_not_served:
    "This lab doesn't collect in that city. Choose another address or a lab visit.",
  slot_unavailable:
    "That time is no longer available. Please pick another window.",
  slot_full: "Someone just took the last visit in that window. Pick another.",
};

export const labBookingMoveErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can update bookings.",
  booking_not_found: "This booking isn't in your list.",
  status_changed:
    "This booking was already updated, perhaps from another tab. The list now shows where it is.",
  invalid_move: "That step isn't possible from where this booking is now.",
  too_early: "The sample can be marked collected from the booked day.",
  reason_required: "Choose a reason.",
  invalid_reason: "Choose one of the listed reasons.",
  note_required: "Add a note saying what happened.",
  invalid_note: `Keep the note under ${MAX_STATUS_NOTE} characters.`,
  report_required: "Upload the report to mark it ready.",
};

// The patient cancelling or moving a booking (LAB-20).
export const labBookingChangeErrorMessages: Record<string, string> = {
  not_patient: "Only patient accounts can change lab bookings.",
  booking_not_found: "This booking isn't in your list.",
  not_changeable:
    "The lab has already taken the sample or closed this booking, so it can't be changed here. Call the lab.",
  reason_required: "Choose a reason.",
  invalid_reason: "Choose one of the listed reasons.",
  note_required: "Add a note for the lab saying why.",
  invalid_note: `Keep the note under ${MAX_STATUS_NOTE} characters.`,
  invalid_visit_date: "Choose a day in the next two weeks.",
  no_home_collection:
    "One of these tests can no longer be collected at home. Cancel and book a lab visit instead.",
  lab_not_found:
    "This lab isn't taking bookings on MedEase right now. You can still cancel.",
  not_collecting:
    "This lab has stopped home collection. Cancel and book a lab visit instead.",
  area_not_served:
    "This lab no longer collects in your city. Cancel and book a lab visit instead.",
  reschedule_limit: `A booking can be moved ${MAX_RESCHEDULES} times. Cancel it and book again, or call the lab.`,
  slot_unavailable:
    "That time is no longer available. Please pick another window.",
  slot_full: "Someone just took the last visit in that window. Pick another.",
};

// Codes meaning the booking can no longer move as it is: reload to show why.
export const staleChangeCodes = new Set([
  "not_changeable",
  "reschedule_limit",
  "lab_not_found",
  "no_home_collection",
]);

// Codes meaning our copy of the windows or catalog is stale: fetch fresh ones.
export const staleBookingCodes = new Set([
  "slot_unavailable",
  "slot_full",
  "item_unavailable",
  "not_collecting",
  "area_not_served",
]);

// "Visit on Mon, Nov 10, 2026" or "Mon, Nov 10 · 7:00 AM – 8:00 AM"
export function formatBookingWhen(
  booking: Pick<
    LabBooking,
    "collection" | "visitDate" | "slotStartsAt" | "slotEndsAt" | "timezone"
  >,
) {
  if (
    booking.collection === "home" &&
    booking.slotStartsAt &&
    booking.slotEndsAt
  ) {
    return `${formatDateTime(booking.slotStartsAt, booking.timezone)} – ${formatTime(booking.slotEndsAt, booking.timezone)}`;
  }
  // Noon UTC keeps the calendar day stable.
  return `Visit on ${formatDate(`${booking.visitDate}T12:00:00Z`, "UTC")}`;
}
