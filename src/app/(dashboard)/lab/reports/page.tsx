import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { getLabBookingsAwaitingReport } from "@/features/lab-booking/data/lab-bookings";
import { AwaitingReportsCard } from "@/features/lab-reports/components/awaiting-reports-card";
import { PublishedReportsCard } from "@/features/lab-reports/components/published-reports-card";
import { listPublishedLabReports } from "@/features/lab-reports/data/lab-reports";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function LabReportsPage() {
  const user = await requireRole("lab");
  const [awaiting, published] = await Promise.all([
    getLabBookingsAwaitingReport(user.id),
    listPublishedLabReports(user.id),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Reports"
        description="Upload each report as a PDF. The patient is told and can open it in their records."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AwaitingReportsCard
          bookings={awaiting.bookings}
          more={awaiting.more}
        />
        <PublishedReportsCard reports={published} />
      </div>
    </>
  );
}
