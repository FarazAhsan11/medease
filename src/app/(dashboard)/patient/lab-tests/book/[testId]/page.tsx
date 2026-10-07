import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { patientRoutes } from "@/config/routes";
import { LabBookingForm } from "@/features/lab-tests/components/lab-booking-form";
import { LabTestSummary } from "@/features/lab-tests/components/lab-test-summary";
import { getBookableTest } from "@/features/lab-tests/data/lab-tests";
import { getAvailableDates, getTimeSlots } from "@/lib/schedule";

const COLLECTION_START_HOUR = 7;
const COLLECTION_END_HOUR = 12;

export async function generateMetadata({
  params,
}: PageProps<"/patient/lab-tests/book/[testId]">): Promise<Metadata> {
  const { testId } = await params;
  const test = getBookableTest(testId);

  return { title: test ? `Book ${test.name}` : "Test not found" };
}

export default async function PatientBookLabTestPage({
  params,
}: PageProps<"/patient/lab-tests/book/[testId]">) {
  const { testId } = await params;
  const test = getBookableTest(testId);

  if (!test) notFound();

  return (
    <>
      <BackLink href={patientRoutes.bookLabTests}>Back to lab tests</BackLink>
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <LabTestSummary test={test} />
        <LabBookingForm
          dates={getAvailableDates()}
          timeSlots={getTimeSlots(COLLECTION_START_HOUR, COLLECTION_END_HOUR)}
        />
      </div>
    </>
  );
}
