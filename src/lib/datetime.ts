// Appointment times are shown in the doctor's timezone (clinic time), so
// everyone sees the same wall-clock time whatever their device is set to.

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", { timeZone, ...options });
    formatters.set(key, cached);
  }
  return cached;
}

type DateInput = string | Date;

const toDate = (value: DateInput) =>
  typeof value === "string" ? new Date(value) : value;

// "Mon, Oct 19, 2026"
export function formatDate(value: DateInput, timeZone: string) {
  return formatter(timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toDate(value));
}

// "10:30 AM"
export function formatTime(value: DateInput, timeZone: string) {
  return formatter(timeZone, { hour: "numeric", minute: "2-digit" }).format(
    toDate(value),
  );
}

// "Mon, Oct 19 · 10:30 AM"
export function formatDateTime(value: DateInput, timeZone: string) {
  const date = formatter(timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(toDate(value));
  return `${date} · ${formatTime(value, timeZone)}`;
}

// Calendar day in the given timezone as "YYYY-MM-DD", for grouping.
export function toDateKey(value: DateInput, timeZone: string) {
  const parts = formatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(toDate(value));
  // Pick parts by type: the locale orders them month/day/year.
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Parts for a date chip: { weekday: "Mon", day: "19", month: "Oct" }.
export function dateChipParts(dateKey: string, timeZone: string) {
  // Noon UTC keeps the calendar day stable across timezones.
  const date = new Date(`${dateKey}T12:00:00Z`);
  const parts = formatter(timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return { weekday: get("weekday"), day: get("day"), month: get("month") };
}

// "09:00" -> "9:00 AM"
export function formatClockTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

export const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
