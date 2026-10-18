import type { Appointment } from "@/features/appointments/lib/appointments";

// iCalendar (.ics) file for one appointment; opens in Google Calendar,
// Outlook and Apple Calendar.

const toIcsDate = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escapeText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\n/g, "\\n");

export function buildAppointmentIcs(appointment: Appointment) {
  const description = [
    `${appointment.doctorName}, ${appointment.doctorSpecialization}`,
    appointment.reason ? `Reason: ${appointment.reason}` : null,
    "Booked through MedEase.",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedEase//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@medease`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(appointment.startsAt)}`,
    `DTEND:${toIcsDate(appointment.endsAt)}`,
    `SUMMARY:${escapeText(`Appointment with ${appointment.doctorName}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
