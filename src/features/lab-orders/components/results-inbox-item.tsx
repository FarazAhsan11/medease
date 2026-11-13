import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes } from "@/config/routes";
import { bookedByLabel } from "@/features/family/lib/relations";
import { LabResultReport } from "@/features/lab-orders/components/lab-result-report";
import {
  priorityLabels,
  waitingLabel,
  type InboxResult,
} from "@/features/lab-orders/lib/lab-orders";
import { formatDate } from "@/lib/datetime";

type ResultsInboxItemProps = {
  result: InboxResult;
  now: Date;
};

// One report in the doctor's results inbox: who it's for, the tests, the
// report itself, and the review.
export function ResultsInboxItem({ result, now }: ResultsInboxItemProps) {
  const bookedBy = bookedByLabel(result);
  // Noon UTC keeps the calendar day stable.
  const day = formatDate(`${result.visitDate}T12:00:00Z`, "UTC");

  return (
    <li className="grid gap-4 rounded-2xl border bg-card p-5">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{result.careRecipientName}</p>
          {result.priority === "urgent" && (
            <StatusBadge tone="danger">
              {priorityLabels[result.priority]}
            </StatusBadge>
          )}
          {result.version > 1 && (
            <StatusBadge tone="warning">Corrected report</StatusBadge>
          )}
          {result.reviewedAt && (
            <StatusBadge tone="muted">Reviewed</StatusBadge>
          )}
        </div>
        {bookedBy && (
          <p className="text-xs text-muted-foreground">{bookedBy}</p>
        )}
      </div>
      <div className="grid gap-0.5 text-sm">
        <p>{result.testNames.join(", ")}</p>
        <p className="text-xs text-muted-foreground">
          {result.labName},{" "}
          {result.collection === "home" ? "home collection" : "lab visit"} on{" "}
          {day}
        </p>
      </div>
      <LabResultReport
        reportId={result.reportId}
        bookingId={result.bookingId}
        publishedAt={result.publishedAt}
        timezone={result.timezone}
        comment={result.comment}
        reviewedAt={result.reviewedAt}
        note={
          result.reviewedAt
            ? undefined
            : (waitingLabel(result.publishedAt, result.timezone, now) ??
              undefined)
        }
        links={
          <Link
            href={doctorRoutes.labOrder(result.appointmentId)}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Visit&apos;s lab tests
          </Link>
        }
      />
    </li>
  );
}
