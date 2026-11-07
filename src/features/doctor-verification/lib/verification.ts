import type { ReviewDecision, ReviewDecisionCopy } from "@/lib/verification";

export const PMDC_REGISTER_URL = "https://pmdc.pk";

export type DoctorDocuments = {
  photo: boolean;
  license: boolean;
  degree: boolean;
};

export const hasAllDocuments = ({ photo, license, degree }: DoctorDocuments) =>
  photo && license && degree;

export const doctorReviewCopy: Record<ReviewDecision, ReviewDecisionCopy> = {
  approved: {
    trigger: "Approve",
    title: "Approve this doctor?",
    description:
      "Only approve after checking their license against the PMDC register. They'll appear in search, and patients can book them.",
    confirm: "Approve doctor",
    pending: "Approving…",
  },
  needs_info: {
    trigger: "Ask for more information",
    title: "Ask for more information?",
    description:
      "They stay hidden from patients and go back into this queue when they send new documents.",
    confirm: "Send request",
    pending: "Sending…",
    noteLabel: "What do you need from them?",
  },
  rejected: {
    trigger: "Reject",
    title: "Reject this doctor?",
    description: "This is final. They stay hidden from patients.",
    confirm: "Reject doctor",
    pending: "Rejecting…",
    noteLabel: "Reason, shown to the doctor",
  },
};

export const doctorBannerText = {
  pending:
    "Patients can't find you yet. Finish your checklist so our team can verify you.",
  needs_info: "Our team needs something from you before you can go live.",
  rejected: "We couldn't verify your account. See why on your status page.",
};
