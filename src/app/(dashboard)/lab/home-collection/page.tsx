import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { CollectionScheduleForm } from "@/features/home-collection/components/collection-schedule-form";
import { ServiceAreasCard } from "@/features/home-collection/components/service-areas-card";
import { getHomeCollectionSetup } from "@/features/home-collection/data/home-collection";
import { getLabVerification } from "@/features/lab-verification/data/lab-verification";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";

export const metadata: Metadata = {
  title: "Home collection",
};

export default async function LabHomeCollectionPage() {
  const { labId } = await requireLabMember("home_collection");
  const [{ settings, hours, areas }, verification] = await Promise.all([
    getHomeCollectionSetup(labId),
    getLabVerification(labId),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Home collection"
        description={
          verification?.status === "approved"
            ? "Where and when your collectors visit patients at home."
            : "Set up home collection now. Patients see it once your lab is verified."
        }
      />
      <CollectionScheduleForm
        settings={settings}
        hours={hours}
        hasAreas={areas.length > 0}
      />
      <ServiceAreasCard areas={areas} />
    </>
  );
}
