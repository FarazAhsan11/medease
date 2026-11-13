import { ClipboardListIcon } from "lucide-react";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { PreviewNotice } from "@/components/shared/preview-notice";
import { StatGrid } from "@/components/shared/stat-grid";
import { VerificationBanner } from "@/components/shared/verification-banner";
import { buttonVariants } from "@/components/ui/button";
import { labRoutes } from "@/config/routes";
import { HomeCollectionsCard } from "@/features/lab-dashboard/components/home-collections-card";
import { PipelineCard } from "@/features/lab-dashboard/components/pipeline-card";
import { PopularTestsCard } from "@/features/lab-dashboard/components/popular-tests-card";
import {
  labBookings,
  labStats,
} from "@/features/lab-dashboard/data/lab-dashboard";
import { getLabVerification } from "@/features/lab-verification/data/lab-verification";
import { labBannerText } from "@/features/lab-verification/lib/lab-verification";
import {
  memberCan,
  requireLabMember,
} from "@/features/lab-staff/lib/lab-member.server";

export default async function LabOverviewPage() {
  const member = await requireLabMember();
  // Only the admin handles verification, so only they wait for it.
  const verification = memberCan(member, "profile")
    ? await getLabVerification(member.labId)
    : null;

  return (
    <>
      <DashboardPageHeader
        title={member.labName}
        description="Today's collections, test queue, and reports at a glance."
        actions={
          <Link
            href="/lab/bookings"
            className={buttonVariants({
              variant: "outline",
              className: "h-9 gap-1.5 px-4",
            })}
          >
            <ClipboardListIcon aria-hidden />
            Manage bookings
          </Link>
        }
      />
      {verification && (
        <VerificationBanner
          status={verification.status}
          title="Your lab isn't live"
          descriptions={labBannerText}
          href={labRoutes.verification}
        />
      )}
      <PreviewNotice
        feature="The lab overview"
        detail="The figures, collections and queue below are sample information."
      />
      <StatGrid stats={labStats} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <HomeCollectionsCard bookings={labBookings} />
        <div className="grid h-fit gap-6">
          <PipelineCard bookings={labBookings} />
          <PopularTestsCard />
        </div>
      </div>
    </>
  );
}
