import { StatusBadge } from "@/components/shared/status-badge";
import { doctorRoutes } from "@/config/routes";
import { LabBookingStatusBadge } from "@/features/lab-booking/components/lab-booking-status-badge";
import { LabResultReviewForm } from "@/features/lab-orders/components/lab-result-review-form";
import {
  testNames,
  type LabOrder,
  type OrderResult,
} from "@/features/lab-orders/lib/lab-orders";
import { LabReportLink } from "@/features/lab-reports/components/lab-report-link";
import { formatDate, formatDateTime } from "@/lib/datetime";

type LabResultEntryProps = {
  order: Pick<LabOrder, "tests">;
  result: OrderResult;
};

// One booking from the doctor's order: the lab, the tests, how far it has got,
// and once the report is out, the report and the doctor's review.
export function LabResultEntry({ order, result }: LabResultEntryProps) {
  const reportId = result.status === "report_ready" ? result.reportId : null;
  // Noon UTC keeps the calendar day stable.
  const day = formatDate(`${result.visitDate}T12:00:00Z`, "UTC");

  return (
    <li className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{result.labName}</p>
        <LabBookingStatusBadge status={result.status} />
        {result.reviewedAt && <StatusBadge tone="muted">Reviewed</StatusBadge>}
      </div>
      <div className="grid gap-0.5 text-sm">
        <p>{testNames(order, result.testIds).join(", ")}</p>
        <p className="text-xs text-muted-foreground">
          {result.collection === "home" ? "Home collection" : "Lab visit"} on{" "}
          {day}
        </p>
      </div>
      {reportId && (
        <div className="grid gap-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <LabReportLink href={doctorRoutes.labReport(reportId)} />
            {result.reportPublishedAt && (
              <p className="text-xs text-muted-foreground">
                Published{" "}
                {formatDateTime(result.reportPublishedAt, result.timezone)}
              </p>
            )}
          </div>
          <LabResultReviewForm
            // Start again from the saved review after a save.
            key={`${result.reviewedAt}:${result.comment}`}
            bookingId={result.bookingId}
            comment={result.comment}
            reviewed={result.reviewedAt !== null}
          />
        </div>
      )}
    </li>
  );
}
