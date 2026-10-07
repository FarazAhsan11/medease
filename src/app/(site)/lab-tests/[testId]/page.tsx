import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { LabBookingForm } from "@/features/lab-tests/components/lab-booking-form";
import { LabTestSummary } from "@/features/lab-tests/components/lab-test-summary";
import { getBookableTest } from "@/features/lab-tests/data/lab-tests";
import { getAvailableDates, getTimeSlots } from "@/lib/schedule";

const COLLECTION_START_HOUR = 7;
const COLLECTION_END_HOUR = 12;

export async function generateMetadata({
  params,
}: PageProps<"/lab-tests/[testId]">): Promise<Metadata> {
  const { testId } = await params;
  const test = getBookableTest(testId);

  return { title: test ? `Book ${test.name}` : "Test not found" };
}

export default async function LabTestBookingPage({
  params,
}: PageProps<"/lab-tests/[testId]">) {
  const { testId } = await params;
  const test = getBookableTest(testId);

  if (!test) notFound();

  return (
    <Container className="py-8">
      <Link
        href="/lab-tests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Back to lab tests
      </Link>
      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <LabTestSummary test={test} />
        <LabBookingForm
          dates={getAvailableDates()}
          timeSlots={getTimeSlots(COLLECTION_START_HOUR, COLLECTION_END_HOUR)}
        />
      </div>
    </Container>
  );
}
