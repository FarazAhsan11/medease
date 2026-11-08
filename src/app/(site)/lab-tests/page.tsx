import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/shared/page-header";
import { publicRoutes } from "@/config/routes";
import { LabTestDirectory } from "@/features/lab-tests/components/lab-test-directory";
import { parseLabTestSearch } from "@/features/lab-tests/data/lab-test-catalog";

export const metadata: Metadata = {
  title: "Lab Tests",
};

export default async function LabTestsPage({
  searchParams,
}: PageProps<"/lab-tests">) {
  const search = parseLabTestSearch(await searchParams);

  return (
    <>
      <PageHeader
        eyebrow="Lab tests"
        title="Compare lab tests"
        description="See what verified labs charge for the same test and how soon results are ready."
      />
      <Container className="py-8">
        <LabTestDirectory
          basePath={publicRoutes.labTests}
          testHref={publicRoutes.labTest}
          search={search}
        />
      </Container>
    </>
  );
}
