import { ClipboardListIcon } from "lucide-react";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
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
import { requireRole } from "@/lib/auth/session";

export default async function LabOverviewPage() {
  const user = await requireRole("lab");
  const verification = await getLabVerification(user.id);

  return (
    <>
      <DashboardPageHeader
        title={user.name}
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
