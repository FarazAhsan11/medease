import { MB } from "@/lib/uploads/file-size";
import type { ReviewDecision, ReviewDecisionCopy } from "@/lib/verification";

export const LAB_DOCUMENTS_BUCKET = "lab-documents";

// The licence file: the bucket enforces the same size and types on its own.
// `types` maps each accepted file type to the extension it's stored with.
export const licenseRule = {
  label: "Licence",
  maxMb: 5,
  types: {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
  } as Record<string, string>,
};

export const isAllowedLicenseFile = (type: string, size: number) =>
  type in licenseRule.types && size > 0 && size <= licenseRule.maxMb * MB;

// Who licenses clinical labs where the lab operates. Keys match the check on
// lab_profiles.licensing_authority.
export const licensingAuthorities = {
  punjab: "Punjab Healthcare Commission",
  sindh: "Sindh Healthcare Commission",
  kp: "Khyber Pakhtunkhwa Health Care Commission",
  islamabad: "Islamabad Healthcare Regulatory Authority",
  balochistan: "Balochistan Healthcare Commission",
  other: "Another authority",
} as const;

export type LicensingAuthority = keyof typeof licensingAuthorities;

export const licensingAuthorityKeys = Object.keys(
  licensingAuthorities,
) as LicensingAuthority[];

// The Punjab commission has a public licence lookup; for the others the admin
// checks with the commission directly.
export const licenceLookups: Partial<Record<LicensingAuthority, string>> = {
  punjab: "https://os.phc.org.pk/verify.aspx",
};

export const labReviewCopy: Record<ReviewDecision, ReviewDecisionCopy> = {
  approved: {
    trigger: "Approve",
    title: "Approve this lab?",
    description:
      "Only approve after checking the licence with the healthcare commission. Patients will be able to find and book this lab.",
    confirm: "Approve lab",
    pending: "Approving…",
  },
  needs_info: {
    trigger: "Ask for more information",
    title: "Ask for more information?",
    description:
      "The lab stays hidden from patients and comes back into this queue when it sends new details.",
    confirm: "Send request",
    pending: "Sending…",
    noteLabel: "What do you need from them?",
  },
  rejected: {
    trigger: "Reject",
    title: "Reject this lab?",
    description: "This is final. The lab stays hidden from patients.",
    confirm: "Reject lab",
    pending: "Rejecting…",
    noteLabel: "Reason, shown to the lab",
  },
};

export const CLOSED_MESSAGE =
  "Your details have been reviewed, so they can't be changed here. Please contact support.";

export const labBannerText = {
  pending:
    "Patients can't find your lab yet. Send your licence details so our team can verify you.",
  needs_info: "Our team needs something from you before your lab can go live.",
  rejected: "We couldn't verify your lab. See why on your status page.",
};
