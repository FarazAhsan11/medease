import { PanelCard } from "@/components/shared/panel-card";
import { labRoutes } from "@/config/routes";
import { itemsSummary } from "@/features/lab-booking/lib/lab-bookings";
import { LabReportLink } from "@/features/lab-reports/components/lab-report-link";
import { ReturnReportDialog } from "@/features/lab-reports/components/return-report-dialog";
import { SignOffReportDialog } from "@/features/lab-reports/components/sign-off-report-dialog";
import type { LabReportSummary } from "@/features/lab-reports/lib/lab-report-summary";
import type { LabSigner } from "@/features/lab-staff/lib/lab-staff";
import { formatDateTime } from "@/lib/datetime";

type ReportsToSignCardProps = {
  reports: LabReportSummary[];
  more: boolean;
  // The viewer may sign off reports, and these are their details, if set.
  canSign: boolean;
  signer: LabSigner | null;
};

// Uploaded reports waiting for a pathologist (LAB-17), longest waiting first.
export function ReportsToSignCard({
  reports,
  more,
  canSign,
  signer,
}: ReportsToSignCardProps) {
  return (
    <PanelCard
      title="To sign off"
      description={
        reports.length === 0
          ? "Uploaded reports wait here until a pathologist signs them off."
          : `${reports.length}${more ? "+" : ""} waiting, longest first. Patients see a report only once it's signed off.`
      }
    >
      {canSign && !signer && (
        <p className="border-t bg-warning-soft px-5 py-3 text-sm">
          Your lab admin needs to add the name and qualification to print on
          reports you sign off.
        </p>
      )}
      {reports.length > 0 && (
        <ul className="divide-y border-t">
          {reports.map((report) => {
            const tests = itemsSummary(
              report.testNames.map((name) => ({ name })),
            );
            const summary = `${report.careRecipientName} · ${tests}`;
            return (
              <li
                key={report.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">
                    {report.careRecipientName}
                  </p>
                  <p className="text-xs break-words text-muted-foreground">
                    {tests} · Uploaded{" "}
                    {formatDateTime(report.uploadedAt, report.timezone)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <LabReportLink href={labRoutes.report(report.id)} />
                  {canSign && signer && (
                    <SignOffReportDialog
                      reportId={report.id}
                      summary={summary}
                      signer={signer}
                    />
                  )}
                  {canSign && (
                    <ReturnReportDialog
                      reportId={report.id}
                      summary={summary}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
