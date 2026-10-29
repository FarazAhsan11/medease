import { siteConfig } from "@/config/site";
import type { Appointment } from "@/features/appointments/lib/appointments";

// iCalendar (.ics) file for one appointment; opens in Google Calendar,
// Outlook and Apple Calendar. Calendars often sync to work or shared
// accounts, so the event never names the doctor, specialty or reason; it
// links back to the app for the details.

export type CalendarAppointment = Pick<
  Appointment,
  "id" | "startsAt" | "endsAt"
>;

const TITLE = `Doctor appointment (${siteConfig.name})`;
const REMINDER_MINUTES = 30;

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

// Lines longer than 75 bytes continue on the next line after a space
// (RFC 5545, section 3.1).
function foldLine(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines spend one byte on the leading space.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);

  return parts.join("\r\n ");
}

export function buildAppointmentIcs(
  appointment: CalendarAppointment,
  url: string,
) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedEase//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@medease`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(appointment.startsAt)}`,
    `DTEND:${toIcsDate(appointment.endsAt)}`,
    `SUMMARY:${escapeText(TITLE)}`,
    `DESCRIPTION:${escapeText(`See the details in ${siteConfig.name}: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(TITLE)}`,
    `TRIGGER:-PT${REMINDER_MINUTES}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldLine)
    .join("\r\n");
}
