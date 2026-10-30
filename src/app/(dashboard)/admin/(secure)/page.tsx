import { ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReviewQueueTable } from "@/features/doctor-verification/components/review-queue-table";
import { listDoctorReviews } from "@/features/doctor-verification/data/doctor-reviews";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Doctor verification",
};

export default async function AdminVerificationPage() {
  await requireAdmin();
  const reviews = await listDoctorReviews();
  const waiting = reviews.filter((review) => review.status === "pending");

  return (
    <>
      <DashboardPageHeader
        title="Doctor verification"
        description={`${waiting.length} waiting for review`}
      />
      {reviews.length > 0 ? (
        <ReviewQueueTable reviews={reviews} />
      ) : (
        <EmptyState
          icon={ShieldCheckIcon}
          title="No doctors yet"
          description="New doctors appear here after they sign up."
        />
      )}
    </>
  );
}
