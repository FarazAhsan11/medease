import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { getLabBookingsAwaitingReport } from "@/features/lab-booking/data/lab-bookings";
import { AwaitingReportsCard } from "@/features/lab-reports/components/awaiting-reports-card";
import { PublishedReportsCard } from "@/features/lab-reports/components/published-reports-card";
import { ReportsToSignCard } from "@/features/lab-reports/components/reports-to-sign-card";
import {
  listPublishedLabReports,
  listReportsToSignOff,
} from "@/features/lab-reports/data/lab-reports";
import { getOwnSigner } from "@/features/lab-staff/data/lab-staff";
import {
  memberCan,
  requireLabMember,
} from "@/features/lab-staff/lib/lab-member.server";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function LabReportsPage() {
  const member = await requireLabMember("reports.view");
  const canSign = memberCan(member, "reports.sign");
  const [awaiting, toSign, published, signer] = await Promise.all([
    getLabBookingsAwaitingReport(member.labId),
    listReportsToSignOff(member.labId),
    listPublishedLabReports(member.labId),
    canSign ? getOwnSigner(member.user.id) : null,
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Reports"
        description="Upload each report as a PDF. A pathologist signs it off, and then the patient is told and can open it in their records."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid h-fit gap-6">
          <ReportsToSignCard
            reports={toSign.reports}
            more={toSign.more}
            canSign={canSign}
            signer={signer}
          />
          <AwaitingReportsCard
            bookings={awaiting.bookings}
            more={awaiting.more}
            canUpload={memberCan(member, "reports.publish")}
            canSign={canSign}
          />
        </div>
        <PublishedReportsCard reports={published} />
      </div>
    </>
  );
}
