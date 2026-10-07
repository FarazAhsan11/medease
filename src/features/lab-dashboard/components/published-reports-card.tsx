import { EyeIcon, FileTextIcon } from "lucide-react";

import { PanelCard } from "@/components/shared/panel-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { PublishedReport } from "@/features/lab-dashboard/data/lab-dashboard";

type PublishedReportsCardProps = {
  reports: PublishedReport[];
};

export function PublishedReportsCard({ reports }: PublishedReportsCardProps) {
  return (
    <PanelCard title="Recently published" className="h-fit">
      <ul className="divide-y">
        {reports.map((report) => (
          <li key={report.id} className="flex items-center gap-3 px-5 py-4">
            <FileTextIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{report.test}</p>
              <p className="text-xs text-muted-foreground">
                {report.patientName} · {report.publishedOn}
              </p>
            </div>
            {report.flagged && (
              <StatusBadge tone="danger">Abnormal</StatusBadge>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`View ${report.test} report for ${report.patientName}`}
            >
              <EyeIcon />
            </Button>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
