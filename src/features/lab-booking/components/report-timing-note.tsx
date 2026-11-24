import { ClockIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import {
  formatLateBy,
  reportTiming,
} from "@/features/lab-booking/lib/report-timing";
import { formatTurnaround } from "@/features/lab-catalog/lib/lab-catalog";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type ReportTimingNoteProps = {
  booking: Pick<
    LabBooking,
    "status" | "turnaroundHours" | "reportDueAt" | "timezone"
  >;
  // The patient is told when to expect the report; the lab when it's due,
  // and how late once past it.
  audience: "patient" | "lab";
  className?: string;
};

// When the report should come, against the lab's promise (LAB-19). A server
// component: it measures against the time of the request.
export function ReportTimingNote({
  booking,
  audience,
  className,
}: ReportTimingNoteProps) {
  const now = new Date().getTime();
  const timing = reportTiming(booking, now);
  if (!timing || (audience === "lab" && timing.kind === "promise")) return null;

  const at = timing.kind === "due" ? timing.at : null;
  const due = at && (
    <time dateTime={at}>{formatDateTime(at, booking.timezone)}</time>
  );

  if (audience === "lab" && timing.kind === "due") {
    return (
      <p
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
          className,
        )}
      >
        {timing.overdue ? (
          <>
            <StatusBadge tone="danger">
              Report overdue by {formatLateBy(timing.at, now)}
            </StatusBadge>
            <span>Was due {due}</span>
          </>
        ) : (
          <>
            <ClockIcon className="size-3.5" aria-hidden />
            <span>Report due {due}</span>
          </>
        )}
      </p>
    );
  }

  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs",
        timing.kind === "due" && timing.overdue
          ? "text-warning"
          : "text-muted-foreground",
        className,
      )}
    >
      <ClockIcon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        {timing.kind === "promise" ? (
          <>
            Report usually ready within {formatTurnaround(timing.hours)} of the
            sample being taken.
          </>
        ) : timing.overdue ? (
          <>
            Your report is taking longer than the lab expected (it was due{" "}
            {due}). Call the lab if you need it urgently.
          </>
        ) : (
          <>Report expected by {due}.</>
        )}
      </span>
    </p>
  );
}
