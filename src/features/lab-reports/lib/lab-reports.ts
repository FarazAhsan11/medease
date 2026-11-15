// Lab reports (LAB-05): the PDF a lab uploads for a booking, released to the
// patient once a pathologist signs it off (LAB-17). Safe to import from client
// components. Design: docs/lab-reports.md.

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

export const UNSTAMPABLE_REPORT_MESSAGE =
  "This PDF is locked or damaged, so the sign-off can't be added to it. Send it back and ask for a new, unlocked copy.";

// A note sent back with a report (return_lab_report).
export const MAX_RETURN_NOTE = 500;

export const labReportErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can work with reports.",
  not_permitted: "Your role in this lab can't do this.",
  booking_not_found: "This booking isn't in your list.",
  status_changed:
    "This booking was already updated, perhaps from another tab. The list now shows where it is.",
  invalid_path: REPORT_UPLOAD_FAILED_MESSAGE,
  upload_not_checked: REPORT_UPLOAD_FAILED_MESSAGE,
  report_awaiting_sign_off:
    "A report for this booking is already waiting for sign-off. A pathologist can send it back if it needs replacing.",
  too_many_versions:
    "This booking has had 20 uploads. Contact MedEase support to add another.",
  signer_details_missing:
    "Your lab admin needs to add the name and qualification to print on reports you sign off.",
  signer_details_changed:
    "Your sign-off details were changed while you were signing. Try again to sign with the new ones.",
  report_not_found: "This report isn't in your list.",
  report_not_pending:
    "This report was already signed off or sent back, perhaps from another tab. The list now shows where it is.",
  invalid_note: `Write a note of up to ${MAX_RETURN_NOTE} characters saying what needs changing.`,
};
