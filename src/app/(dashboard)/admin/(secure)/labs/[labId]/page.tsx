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
import { reviewLab } from "@/features/lab-verification/actions/review-lab";
import {
  getLabReview,
  getLicenseLink,
  isReadyForApproval,
} from "@/features/lab-verification/data/lab-reviews";
import {
  labReviewCopy,
  licenceLookups,
  licensingAuthorities,
} from "@/features/lab-verification/lib/lab-verification";
import { requireAdmin } from "@/lib/auth/session";
import { isOpenForReview, reviewDecisions } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Review lab",
};

export default async function AdminLabReviewPage({
  params,
}: PageProps<"/admin/labs/[labId]">) {
  await requireAdmin();
  const { labId } = await params;
  const review = await getLabReview(labId);

  if (!review) notFound();

  const licenseLink = await getLicenseLink(review);
  const authority = review.licensingAuthority;
  const lookup = authority ? licenceLookups[authority] : undefined;
  const canApprove = isReadyForApproval(review);

  return (
    <>
      <BackLink href={adminRoutes.labs}>All labs</BackLink>
      <DashboardPageHeader
        title={review.name}
        description={review.address}
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
                { label: "Contact person", value: review.contactPerson },
                { label: "Phone", value: review.phone },
                { label: "Address", value: review.address },
                {
                  label: "Services",
                  value:
                    review.services.length > 0
                      ? review.services.join(", ")
                      : "None listed",
                },
              ]}
            />
          </div>
        </PanelCard>

        <PanelCard
          title="Licence"
          description="The link expires after 5 minutes. Reload for a new one."
        >
          <div className="grid gap-4 p-5">
            <DetailList
              items={[
                {
                  label: "Licensed by",
                  value: authority ? (
                    licensingAuthorities[authority]
                  ) : (
                    <span className="text-destructive">Not set</span>
                  ),
                },
                {
                  label: "Licence number",
                  value: review.registrationNumber,
                },
                {
                  label: "Licence",
                  value: <DocumentLink url={licenseLink} />,
                },
              ]}
            />
            {lookup ? (
              <a
                href={lookup}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Look up the licence
                <ExternalLinkIcon className="size-3.5" aria-hidden />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                Confirm the licence with the authority before approving.
              </p>
            )}
          </div>
        </PanelCard>
      </div>

      {review.note && (
        <PanelCard title="Last message to the lab">
          <p className="p-5 text-sm text-muted-foreground">{review.note}</p>
        </PanelCard>
      )}

      {isOpenForReview(review.status) && (
        <PanelCard
          title="Decision"
          description={
            canApprove
              ? "The lab is emailed with the outcome."
              : "Approval needs a confirmed email, the licensing authority and the licence."
          }
        >
          <div className="flex flex-wrap gap-2 p-5">
            {reviewDecisions.map((decision) => (
              <ReviewDecisionDialog
                key={decision}
                action={reviewLab}
                target={{
                  labId: review.id,
                  submittedAt: review.submittedAt ?? "",
                }}
                decision={decision}
                copy={labReviewCopy[decision]}
                disabled={decision === "approved" && !canApprove}
              />
            ))}
          </div>
        </PanelCard>
      )}
    </>
  );
}
