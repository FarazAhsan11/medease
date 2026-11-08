import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { BackLink } from "@/components/shared/back-link";
import { publicRoutes } from "@/config/routes";
import { LabTestComparison } from "@/features/lab-tests/components/lab-test-comparison";
import {
  getLabTestDetails,
  getLabTestOffers,
} from "@/features/lab-tests/data/lab-test-catalog";

export async function generateMetadata({
  params,
}: PageProps<"/lab-tests/[testId]">): Promise<Metadata> {
  const test = await getLabTestDetails((await params).testId);
  return { title: test ? `${test.name}: compare labs` : "Test not found" };
}

export default async function LabTestPage({
  params,
}: PageProps<"/lab-tests/[testId]">) {
  const { testId } = await params;
  const [test, offers] = await Promise.all([
    getLabTestDetails(testId),
    getLabTestOffers(testId),
  ]);
  if (!test) notFound();

  return (
    <Container className="space-y-6 py-8">
      <BackLink href={publicRoutes.labTests}>Back to lab tests</BackLink>
      <LabTestComparison test={test} offers={offers} />
    </Container>
  );
}
