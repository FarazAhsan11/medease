import type { Appointment } from "@/features/appointments/lib/appointments";
import {
  getPrescribeBlock,
  PRESCRIBE_WINDOW_DAYS,
  type PrescribeBlock,
} from "@/features/prescriptions/lib/prescriptions";
import { addDaysToDateKey, toDateKey } from "@/lib/datetime";

// What the doctor tells the patient after a visit (REC-01). The doctor's
// private notes stay in appointment_notes.
export type VisitSummary = {
  appointmentId: string;
  diagnosis: string | null;
  advice: string | null;
  // A clinic-time date key, e.g. "2026-11-10".
  followUpOn: string | null;
  updatedAt: string;
};

export type VisitSummaryRow = {
  appointment_id: string;
  diagnosis: string | null;
  advice: string | null;
  follow_up_on: string | null;
  updated_at: string;
};

export const toVisitSummary = (row: VisitSummaryRow): VisitSummary => ({
  appointmentId: row.appointment_id,
  diagnosis: row.diagnosis,
  advice: row.advice,
  followUpOn: row.follow_up_on,
  updatedAt: row.updated_at,
});

export const MAX_DIAGNOSIS = 200;
export const MAX_ADVICE = 2000;
export const MAX_FOLLOW_UP_DAYS = 365;

// Same window as a prescription; save_visit_summary checks it too.
export const getSummaryBlock = (
  appointment: Pick<Appointment, "status" | "startsAt">,
  now?: number,
): PrescribeBlock | null => getPrescribeBlock(appointment, now);

export const summaryBlockMessages: Record<PrescribeBlock, string> = {
  cancelled: "This appointment was cancelled, so it has no summary.",
  no_show: "This appointment was marked as a no-show, so it has no summary.",
  not_started:
    "You can write a summary once the appointment has started, during or after the call.",
  window_closed: `Summaries can be written or edited up to ${PRESCRIBE_WINDOW_DAYS} days after the appointment.`,
};

// Follow-ups fall after the visit day and within a year of it (clinic time).
export function followUpRange(
  appointment: Pick<Appointment, "startsAt" | "timezone">,
) {
  const visitDay = toDateKey(appointment.startsAt, appointment.timezone);
  return {
    min: addDaysToDateKey(visitDay, 1),
    max: addDaysToDateKey(visitDay, MAX_FOLLOW_UP_DAYS),
  };
}
