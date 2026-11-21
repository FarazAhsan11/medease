import type { ReactNode } from "react";

import { doctorRoutes } from "@/config/routes";
import { LabResultReviewForm } from "@/features/lab-orders/components/lab-result-review-form";
import { LabReportLink } from "@/features/lab-reports/components/lab-report-link";
import { ReportCorrectionNote } from "@/features/lab-reports/components/report-correction-note";
import type { ReportCorrection } from "@/features/lab-reports/lib/report-correction";
import { formatDateTime } from "@/lib/datetime";

type LabResultReportProps = {
  reportId: string;
  bookingId: string;
  publishedAt: string | null;
  timezone: string;
  comment: string | null;
  reviewedAt: string | null;
  // Set when the report corrects an earlier one (LAB-18).
  correction: ReportCorrection | null;
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
  correction,
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
      {correction && (
        <ReportCorrectionNote
          correction={correction}
          previousHref={doctorRoutes.labReport(correction.previousReportId)}
        />
      )}
      {correction && !reviewedAt && comment && (
        <p className="text-xs text-muted-foreground">
          Your comment was about the earlier version, so the patient
          doesn&apos;t see it until you review this one.
        </p>
      )}
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
