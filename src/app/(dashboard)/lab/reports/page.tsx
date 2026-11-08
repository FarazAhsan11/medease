import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { PreviewNotice } from "@/components/shared/preview-notice";
import { PendingReportsCard } from "@/features/lab-dashboard/components/pending-reports-card";
import { PublishedReportsCard } from "@/features/lab-dashboard/components/published-reports-card";
import {
  labBookings,
  publishedReports,
} from "@/features/lab-dashboard/data/lab-dashboard";

export const metadata: Metadata = {
  title: "Reports",
};

export default function LabReportsPage() {
  return (
    <>
      <PreviewNotice feature="Lab reports" />
      <DashboardPageHeader
        title="Reports"
        description="Upload results and publish them to patient dashboards."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <PendingReportsCard bookings={labBookings} />
        <PublishedReportsCard reports={publishedReports} />
      </div>
    </>
  );
}
