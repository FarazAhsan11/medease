import type { ReactNode } from "react";

import { doctorRoutes } from "@/config/routes";
import { LabResultReviewForm } from "@/features/lab-orders/components/lab-result-review-form";
import { LabReportLink } from "@/features/lab-reports/components/lab-report-link";
import { formatDateTime } from "@/lib/datetime";

type LabResultReportProps = {
  reportId: string;
  bookingId: string;
  publishedAt: string | null;
  timezone: string;
  comment: string | null;
  reviewedAt: string | null;
  // More links beside the report's.
  links?: ReactNode;
  // Said after the published time, e.g. how long it has waited.
  note?: string;
};

// A published report from the doctor's order, with the doctor's review: on the
// visit's lab tests page and in the results inbox.
export function LabResultReport({
  reportId,
  bookingId,
  publishedAt,
  timezone,
  comment,
  reviewedAt,
  links,
  note,
}: LabResultReportProps) {
  return (
    <div className="grid gap-4 border-t pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <LabReportLink href={doctorRoutes.labReport(reportId)} />
        {links}
        {publishedAt && (
          <p className="text-xs text-muted-foreground">
            Published {formatDateTime(publishedAt, timezone)}
            {note && `, ${note}`}
          </p>
        )}
      </div>
      <LabResultReviewForm
        // Start again from the saved review after a save.
        key={`${reviewedAt}:${comment}`}
        bookingId={bookingId}
        comment={comment}
        reviewed={reviewedAt !== null}
      />
    </div>
  );
}
