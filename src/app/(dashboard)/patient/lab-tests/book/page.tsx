import type { Metadata } from "next";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { patientRoutes } from "@/config/routes";
import { LabTestDirectory } from "@/features/lab-tests/components/lab-test-directory";
import { parseLabTestSearch } from "@/features/lab-tests/data/lab-test-catalog";

export const metadata: Metadata = {
  title: "Find a lab test",
};

export default async function PatientBookLabTestsPage({
  searchParams,
}: PageProps<"/patient/lab-tests/book">) {
  const search = parseLabTestSearch(await searchParams);

  return (
    <>
      <BackLink href={patientRoutes.labTests}>Back to my lab tests</BackLink>
      <DashboardPageHeader
        title="Find a lab test"
        description="Compare what verified labs charge and how soon results are ready."
      />
      <LabTestDirectory
        basePath={patientRoutes.bookLabTests}
        testHref={patientRoutes.labTest}
        search={search}
      />
    </>
  );
}
