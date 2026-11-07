import { FlaskConicalIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LabReviewQueueTable } from "@/features/lab-verification/components/lab-review-queue-table";
import { listLabReviews } from "@/features/lab-verification/data/lab-reviews";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Lab verification",
};

export default async function AdminLabVerificationPage() {
  await requireAdmin();
  const reviews = await listLabReviews();
  const waiting = reviews.filter((review) => review.status === "pending");

  return (
    <>
      <DashboardPageHeader
        title="Lab verification"
        description={`${waiting.length} waiting for review`}
      />
      {reviews.length > 0 ? (
        <LabReviewQueueTable reviews={reviews} />
      ) : (
        <EmptyState
          icon={FlaskConicalIcon}
          title="No labs yet"
          description="New labs appear here after they sign up."
        />
      )}
    </>
  );
}
