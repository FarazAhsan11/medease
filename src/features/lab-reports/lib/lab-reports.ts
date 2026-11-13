// Lab reports (LAB-05): the PDF a lab publishes for a booking. Safe to import
// from client components.
// Design: docs/lab-booking.md ("Reports").

import { MB } from "@/lib/uploads/file-size";

export const LAB_REPORTS_BUCKET = "lab-reports";

// Match the bucket's limit.
export const MAX_REPORT_MB = 10;
export const MAX_REPORT_BYTES = MAX_REPORT_MB * MB;

// PDF only: what labs issue, and what every browser opens by itself.
export const reportFileTypes: Record<string, string> = {
  "application/pdf": "pdf",
};

export const REPORT_ACCEPT = Object.keys(reportFileTypes).join(",");

export function isAllowedReportFile(type: string, size: number) {
  return type in reportFileTypes && size > 0 && size <= MAX_REPORT_BYTES;
}

export const REPORT_UPLOAD_FAILED_MESSAGE =
  "The report didn't upload correctly. Check it's a PDF and try again.";

export const labReportErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can publish reports.",
  not_permitted: "Your role in this lab can't publish reports.",
  booking_not_found: "This booking isn't in your list.",
  status_changed:
    "This booking was already updated, perhaps from another tab. The list now shows where it is.",
  invalid_path: REPORT_UPLOAD_FAILED_MESSAGE,
  upload_not_checked: REPORT_UPLOAD_FAILED_MESSAGE,
};
