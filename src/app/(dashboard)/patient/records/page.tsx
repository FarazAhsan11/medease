import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { DocumentsTable } from "@/features/health-records/components/documents-table";
import { MedicalSummaryCard } from "@/features/health-records/components/medical-summary-card";
import { VitalCard } from "@/features/health-records/components/vital-card";
import {
  healthDocuments,
  vitals,
} from "@/features/health-records/data/health-records";

export const metadata: Metadata = {
  title: "Health records",
};

export default function PatientRecordsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Health records"
        description="Your vitals, medical history, and documents in one place."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {vitals.map((vital) => (
          <VitalCard key={vital.label} vital={vital} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <DocumentsTable documents={healthDocuments} />
        <MedicalSummaryCard />
      </div>
    </>
  );
}
