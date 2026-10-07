import type { Metadata } from "next";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { patientRoutes } from "@/config/routes";
import { LabTestDirectory } from "@/features/lab-tests/components/lab-test-directory";

export const metadata: Metadata = {
  title: "Book a lab test",
};

export default function PatientBookLabTestsPage() {
  return (
    <>
      <BackLink href={patientRoutes.labTests}>Back to my lab tests</BackLink>
      <DashboardPageHeader
        title="Book a lab test"
        description="Choose a test or package. Home sample collection is free."
      />
      <LabTestDirectory />
    </>
  );
}
