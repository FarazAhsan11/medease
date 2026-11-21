// A released report that corrects an earlier one (LAB-18): why, and the
// version it replaced, which stays readable. Safe to import from client
// components.
export type ReportCorrection = {
  reason: string;
  previousReportId: string;
};

export function toReportCorrection(
  report: {
    corrects_report_id: string | null;
    correction_reason: string | null;
  } | null,
): ReportCorrection | null {
  if (!report?.corrects_report_id || !report.correction_reason) return null;
  return {
    reason: report.correction_reason,
    previousReportId: report.corrects_report_id,
  };
}
