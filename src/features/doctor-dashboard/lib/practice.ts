import {
  isActive,
  isUpcoming,
  type Appointment,
} from "@/features/appointments/lib/appointments";
import { toDateKey } from "@/lib/datetime";

// Completed visits each patient had before each appointment, keyed by
// appointment id. One pass in time order.
export function countPreviousVisits(appointments: Appointment[]) {
  const counts: Record<string, number> = {};
  const completedSoFar = new Map<string, number>();

  for (const appointment of [...appointments].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  )) {
    const before = completedSoFar.get(appointment.patientId) ?? 0;
    counts[appointment.id] = before;
    if (appointment.status === "completed") {
      completedSoFar.set(appointment.patientId, before + 1);
    }
  }
  return counts;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startingWithin(appointments: Appointment[], days: number) {
  const until = Date.now() + days * DAY_MS;
  return appointments.filter((item) => Date.parse(item.startsAt) < until);
}

export function isToday(appointment: Appointment, now = new Date()) {
  return (
    toDateKey(appointment.startsAt, appointment.timezone) ===
    toDateKey(now, appointment.timezone)
  );
}

export function groupDoctorAppointments(appointments: Appointment[]) {
  const now = Date.now();
  const byStartAsc = (a: Appointment, b: Appointment) =>
    a.startsAt.localeCompare(b.startsAt);
  const byStartDesc = (a: Appointment, b: Appointment) =>
    b.startsAt.localeCompare(a.startsAt);

  return {
    // In-progress appointments stay under Upcoming until the call window
    // closes, so the Join button is easy to find.
    upcoming: appointments.filter((a) => isActive(a, now)).sort(byStartAsc),
    needsOutcome: appointments
      .filter((a) => a.status === "booked" && !isActive(a, now))
      .sort(byStartDesc),
    past: appointments
      .filter((a) => a.status === "completed" || a.status === "no_show")
      .sort(byStartDesc),
    cancelled: appointments
      .filter((a) => a.status === "cancelled")
      .sort(byStartDesc),
  };
}

export type PatientSummary = {
  patientId: string;
  name: string;
  email: string;
  phone: string | null;
  completedVisits: number;
  lastVisit: Appointment | null;
  nextVisit: Appointment | null;
};

export function summarizePatients(appointments: Appointment[]) {
  const now = Date.now();
  const patients = new Map<string, PatientSummary>();

  for (const appointment of [...appointments].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  )) {
    const summary = patients.get(appointment.patientId) ?? {
      patientId: appointment.patientId,
      name: appointment.patientName,
      email: appointment.patientEmail,
      phone: appointment.patientPhone,
      completedVisits: 0,
      lastVisit: null,
      nextVisit: null,
    };
    // Newest booking has the freshest contact details.
    summary.name = appointment.patientName;
    summary.phone = appointment.patientPhone ?? summary.phone;

    if (appointment.status === "completed") {
      summary.completedVisits += 1;
      summary.lastVisit = appointment;
    }
    if (!summary.nextVisit && isUpcoming(appointment, now)) {
      summary.nextVisit = appointment;
    }
    patients.set(appointment.patientId, summary);
  }

  return [...patients.values()].sort((a, b) => a.name.localeCompare(b.name));
}
