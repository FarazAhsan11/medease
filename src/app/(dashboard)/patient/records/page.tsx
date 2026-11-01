import type { Metadata } from "next";

import { PreviewNotice } from "@/components/shared/preview-notice";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { DocumentsTable } from "@/features/health-records/components/documents-table";
import { MedicalSummaryCard } from "@/features/health-records/components/medical-summary-card";
import { VitalCard } from "@/features/health-records/components/vital-card";
import {
  healthDocuments,
  vitals,
} from "@/features/health-records/data/health-records";
import { getPatientProfile } from "@/features/settings/data/patient-profile";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Health records",
};

export default async function PatientRecordsPage() {
  const user = await requireRole("patient");
  const profile = await getPatientProfile(user.id, user.email);

  return (
    <>
      <PreviewNotice feature="Vitals and document storage" />
      <DashboardPageHeader
        title="Health records"
        description="Your vitals, medical history, and documents in one place."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {vitals.map((vital) => (
          <VitalCard key={vital.label} vital={vital} />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <DocumentsTable documents={healthDocuments} />
        {profile && <MedicalSummaryCard profile={profile} />}
      </div>
    </>
  );
}
