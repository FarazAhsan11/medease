import type { StatusTone } from "@/components/shared/status-badge";

export type VerificationStatus =
  "pending" | "needs_info" | "approved" | "rejected";

export type ReviewDecision = Exclude<VerificationStatus, "pending">;

export const PMDC_REGISTER_URL = "https://pmdc.pk";

export const verificationBadges: Record<
  VerificationStatus,
  { label: string; tone: StatusTone }
> = {
  pending: { label: "In review", tone: "info" },
  needs_info: { label: "More information needed", tone: "warning" },
  approved: { label: "Verified", tone: "success" },
  rejected: { label: "Not approved", tone: "danger" },
};

// Approved and rejected are final: reviewed files can't be replaced, and the
// same check runs in save_verification_documents and admin_review_doctor.
export const isOpenForReview = (status: VerificationStatus) =>
  status === "pending" || status === "needs_info";

export type DoctorDocuments = {
  photo: boolean;
  license: boolean;
  degree: boolean;
};

export const hasAllDocuments = ({ photo, license, degree }: DoctorDocuments) =>
  photo && license && degree;
