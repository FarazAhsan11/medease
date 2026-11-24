// Where a booking stands against the lab's promised turnaround (LAB-19).
// The clock starts when the sample is collected (track_lab_turnaround).
// Design: docs/lab-samples.md, "Turnaround (LAB-19)".

import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";

export type ReportTiming =
  // Before collection: the promise, counted from when the sample is taken.
  | { kind: "promise"; hours: number }
  // In the lab: when the report is due, and whether that has passed.
  | { kind: "due"; at: string; overdue: boolean }
  | null;

export function reportTiming(
  booking: Pick<LabBooking, "status" | "turnaroundHours" | "reportDueAt">,
  now: number,
): ReportTiming {
  switch (booking.status) {
    case "awaiting_payment":
    case "booked":
    case "recollection_needed":
      return booking.turnaroundHours === null
        ? null
        : { kind: "promise", hours: booking.turnaroundHours };
    case "sample_collected":
    case "processing":
      return booking.reportDueAt === null
        ? null
        : {
            kind: "due",
            at: booking.reportDueAt,
            // Match get_lab_turnaround: due at the time itself is still on time.
            overdue: Date.parse(booking.reportDueAt) < now,
          };
    default:
      return null;
  }
}

// "3 hours", "2 days 4 hours": how far past due, for the lab.
export function formatLateBy(dueAt: string, now: number) {
  const hours = Math.max(1, Math.floor((now - Date.parse(dueAt)) / 3_600_000));
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  const parts = [
    days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : null,
    rest > 0 ? `${rest} ${rest === 1 ? "hour" : "hours"}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}
