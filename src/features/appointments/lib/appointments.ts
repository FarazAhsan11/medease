// Appointment shape shared by the patient and doctor dashboards, plus small
// pure helpers. Safe to import from client components.

export type AppointmentStatus =
  "booked" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  id: string;
  doctorId: string;
  patientId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  doctorName: string;
  doctorSpecialization: string;
  consultationFee: number;
  timezone: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string | null;
  cancelledBy: "patient" | "doctor" | null;
  cancellationReason: string | null;
  callStartedAt: string | null;
  callEndedAt: string | null;
  createdAt: string;
};

export type AppointmentRow = {
  id: string;
  doctor_id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  reason: string | null;
  doctor_name: string;
  doctor_specialization: string;
  consultation_fee: number;
  timezone: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  cancelled_by: "patient" | "doctor" | null;
  cancellation_reason: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  created_at: string;
};

export function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    reason: row.reason,
    doctorName: row.doctor_name,
    doctorSpecialization: row.doctor_specialization,
    consultationFee: row.consultation_fee,
    timezone: row.timezone,
    patientName: row.patient_name,
    patientEmail: row.patient_email,
    patientPhone: row.patient_phone,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    callStartedAt: row.call_started_at,
    callEndedAt: row.call_ended_at,
    createdAt: row.created_at,
  };
}

// Video calls open 5 minutes early and last at most 30 minutes from the
// start. Keep in sync with can_join_call in the video calls migration.
export const CALL_WINDOW = { earlyMinutes: 5, lengthMinutes: 30 } as const;
const MINUTE_MS = 60_000;

export function getCallWindow(startsAt: string) {
  const start = Date.parse(startsAt);
  return {
    opensAt: start - CALL_WINDOW.earlyMinutes * MINUTE_MS,
    closesAt: start + CALL_WINDOW.lengthMinutes * MINUTE_MS,
  };
}

// Not started yet (still cancellable).
export const isUpcoming = (appointment: Appointment, now = Date.now()) =>
  appointment.status === "booked" && Date.parse(appointment.startsAt) > now;

// Not started, or started but the call window is still open.
export const isActive = (appointment: Appointment, now = Date.now()) =>
  appointment.status === "booked" &&
  now < getCallWindow(appointment.startsAt).closesAt;

// Started and the call window is open right now.
export const isInProgress = (appointment: Appointment, now = Date.now()) =>
  isActive(appointment, now) && !isUpcoming(appointment, now);

// Booked but already started: waiting for the doctor to record the outcome.
export const needsOutcome = (appointment: Appointment, now = Date.now()) =>
  appointment.status === "booked" && Date.parse(appointment.startsAt) <= now;

export function groupAppointments(
  appointments: Appointment[],
  now = Date.now(),
) {
  const upcoming = appointments
    .filter((item) => isActive(item, now))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const past = appointments
    .filter((item) => item.status !== "cancelled" && !isActive(item, now))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const cancelled = appointments
    .filter((item) => item.status === "cancelled")
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

  return { upcoming, past, cancelled };
}
