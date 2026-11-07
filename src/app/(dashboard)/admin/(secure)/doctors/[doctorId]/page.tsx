import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { DetailList } from "@/components/shared/detail-list";
import { DocumentLink } from "@/components/shared/document-link";
import { PanelCard } from "@/components/shared/panel-card";
import { ReviewDecisionDialog } from "@/components/shared/review-decision-dialog";
import { VerificationStatusBadge } from "@/components/shared/verification-status-badge";
import { adminRoutes } from "@/config/routes";
import { reviewDoctor } from "@/features/doctor-verification/actions/review-doctor";
import {
  getDocumentLinks,
  getDoctorReview,
} from "@/features/doctor-verification/data/doctor-reviews";
import {
  doctorReviewCopy,
  hasAllDocuments,
  PMDC_REGISTER_URL,
} from "@/features/doctor-verification/lib/verification";
import { requireAdmin } from "@/lib/auth/session";
import { isOpenForReview, reviewDecisions } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Review doctor",
};

export default async function AdminDoctorReviewPage({
  params,
}: PageProps<"/admin/doctors/[doctorId]">) {
  await requireAdmin();
  const { doctorId } = await params;
  const review = await getDoctorReview(doctorId);

  if (!review) notFound();

  const links = await getDocumentLinks(review);
  const canApprove = review.emailConfirmed && hasAllDocuments(review.documents);

  return (
    <>
      <BackLink href={adminRoutes.home}>All doctors</BackLink>
      <DashboardPageHeader
        title={review.name}
        description={review.specialization}
        actions={<VerificationStatusBadge status={review.status} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PanelCard title="Submitted details">
          <div className="p-5">
            <DetailList
              items={[
                { label: "Email", value: review.email },
                {
                  label: "Email confirmed",
                  value: review.emailConfirmed ? "Yes" : "No",
                },
                { label: "Phone", value: review.phone },
                { label: "Age", value: `${review.age} years` },
                { label: "Gender", value: review.gender },
                { label: "City", value: review.city ?? "Not set" },
                { label: "Clinic", value: review.clinicAddress },
              ]}
            />
          </div>
        </PanelCard>

        <PanelCard
          title="Credentials"
          description="Links expire after 5 minutes. Reload for new ones."
        >
          <div className="grid gap-4 p-5">
            <DetailList
              items={[
                { label: "License number", value: review.licenseNumber },
                {
                  label: "PMDC license",
                  value: <DocumentLink url={links.license} />,
                },
                {
                  label: "Degree certificate",
                  value: <DocumentLink url={links.degree} />,
                },
                {
                  label: "Profile photo",
                  value: <DocumentLink url={links.photo} />,
                },
              ]}
            />
            <a
              href={PMDC_REGISTER_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Look up the PMDC register
              <ExternalLinkIcon className="size-3.5" aria-hidden />
            </a>
          </div>
        </PanelCard>
      </div>

      {review.note && (
        <PanelCard title="Last message to the doctor">
          <p className="p-5 text-sm text-muted-foreground">{review.note}</p>
        </PanelCard>
      )}

      {isOpenForReview(review.status) && (
        <PanelCard
          title="Decision"
          description={
            canApprove
              ? "The doctor is emailed with the outcome."
              : "Approval needs a confirmed email and all three documents."
          }
        >
          <div className="flex flex-wrap gap-2 p-5">
            {reviewDecisions.map((decision) => (
              <ReviewDecisionDialog
                key={decision}
                action={reviewDoctor}
                target={{ doctorId: review.id }}
                decision={decision}
                copy={doctorReviewCopy[decision]}
                disabled={decision === "approved" && !canApprove}
              />
            ))}
          </div>
        </PanelCard>
      )}
    </>
  );
}
