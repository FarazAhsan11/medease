import { z } from "zod";

import type { StatusTone } from "@/components/shared/status-badge";

// Doctors and labs go through the same review: the same statuses, and the
// same rules in save_verification_documents, save_lab_verification and the
// admin review functions.
export type VerificationStatus =
  "pending" | "needs_info" | "approved" | "rejected";

export type ReviewDecision = Exclude<VerificationStatus, "pending">;

export const reviewDecisions = ["approved", "needs_info", "rejected"] as const;

// The submitted_at the review page showed, sent back with the decision so the
// database can refuse it if new details arrived since. Empty if none was sent.
export const submittedAtField = z
  .string()
  .max(40)
  .transform((value) => value || null);

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
