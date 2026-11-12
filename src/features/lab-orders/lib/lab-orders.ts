import type { Appointment } from "@/features/appointments/lib/appointments";
import {
  getPrescribeBlock,
  PRESCRIBE_WINDOW_DAYS,
  type PrescribeBlock,
} from "@/features/prescriptions/lib/prescriptions";

// Lab tests the doctor orders at a visit (RX-04). Design: docs/lab-orders.md.

export const LAB_ORDER_PRIORITIES = ["routine", "urgent"] as const;
export type LabOrderPriority = (typeof LAB_ORDER_PRIORITIES)[number];

export const MAX_ORDER_TESTS = 20;
export const MAX_ORDER_NOTE = 500;

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
  invalid_lab_order: `Check the order: choose 1 to ${MAX_ORDER_TESTS} tests and keep the note under ${MAX_ORDER_NOTE} characters.`,
};
