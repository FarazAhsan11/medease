import type { StatusTone } from "@/components/shared/status-badge";

// Doctors and labs go through the same review: the same statuses, and the
// same rules in save_verification_documents, save_lab_verification and the
// admin review functions.
export type VerificationStatus =
  "pending" | "needs_info" | "approved" | "rejected";

export type ReviewDecision = Exclude<VerificationStatus, "pending">;

export const reviewDecisions = ["approved", "needs_info", "rejected"] as const;

export const verificationBadges: Record<
  VerificationStatus,
  { label: string; tone: StatusTone }
> = {
  pending: { label: "In review", tone: "info" },
  needs_info: { label: "More information needed", tone: "warning" },
  approved: { label: "Verified", tone: "success" },
  rejected: { label: "Not approved", tone: "danger" },
};

// Approved and rejected are final: reviewed files can't be replaced.
export const isOpenForReview = (status: VerificationStatus) =>
  status === "pending" || status === "needs_info";

// What the admin's decision dialog says, per decision.
export type ReviewDecisionCopy = {
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  pending: string;
  noteLabel?: string;
};
