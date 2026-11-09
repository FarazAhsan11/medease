import { FileTextIcon } from "lucide-react";

import { PanelCard } from "@/components/shared/panel-card";
import { labRoutes } from "@/config/routes";
import { itemsSummary } from "@/features/lab-booking/lib/lab-bookings";
import type { LabReportSummary } from "@/features/lab-reports/lib/lab-report-summary";
import { formatDateTime } from "@/lib/datetime";

type PublishedReportsCardProps = {
  reports: LabReportSummary[];
};

// The lab's latest published reports, to check one again.
export function PublishedReportsCard({ reports }: PublishedReportsCardProps) {
  return (
    <PanelCard
      title="Recently published"
      description={
        reports.length === 0 ? "Reports you publish appear here." : undefined
      }
      className="h-fit"
    >
      {reports.length > 0 && (
        <ul className="divide-y">
          {reports.map((report) => {
            const tests = itemsSummary(
              report.testNames.map((name) => ({ name })),
            );
            return (
              <li key={report.id}>
                {/* A plain link: the route redirects to the file. */}
                <a
                  href={labRoutes.report(report.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <FileTextIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words">
                      {report.careRecipientName}
                    </span>
                    <span className="block text-xs break-words text-muted-foreground">
                      {tests} ·{" "}
                      {formatDateTime(report.publishedAt, report.timezone)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-primary">
                    View
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
