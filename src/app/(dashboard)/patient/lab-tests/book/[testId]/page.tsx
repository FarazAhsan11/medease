import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { patientRoutes } from "@/config/routes";
import { LabTestComparison } from "@/features/lab-tests/components/lab-test-comparison";
import {
  getLabTestDetails,
  getLabTestOffers,
} from "@/features/lab-tests/data/lab-test-catalog";

export async function generateMetadata({
  params,
}: PageProps<"/patient/lab-tests/book/[testId]">): Promise<Metadata> {
  const test = await getLabTestDetails((await params).testId);
  return { title: test ? `${test.name}: compare labs` : "Test not found" };
}

export default async function PatientLabTestPage({
  params,
}: PageProps<"/patient/lab-tests/book/[testId]">) {
  const { testId } = await params;
  const [test, offers] = await Promise.all([
    getLabTestDetails(testId),
    getLabTestOffers(testId),
  ]);
  if (!test) notFound();

  return (
    <>
      <BackLink href={patientRoutes.bookLabTests}>Back to lab tests</BackLink>
      <LabTestComparison test={test} offers={offers} />
    </>
  );
}
