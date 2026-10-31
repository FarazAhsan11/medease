import type { Metadata } from "next";

import { PreviewNotice } from "@/components/shared/preview-notice";
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
      <PreviewNotice feature="Lab booking" />
      <BackLink href={patientRoutes.labTests}>Back to my lab tests</BackLink>
      <DashboardPageHeader
        title="Book a lab test"
        description="Sample tests and packages."
      />
      <LabTestDirectory />
    </>
  );
}
