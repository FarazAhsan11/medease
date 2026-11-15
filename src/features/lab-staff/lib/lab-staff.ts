import type { LabMemberRole } from "@/features/lab-staff/lib/lab-permissions";

// A lab holds this many people besides its admin (add_lab_staff).
export const MAX_LAB_STAFF = 50;

export type LabStaffMember = {
  userId: string;
  name: string;
  email: string;
  role: LabMemberRole;
  status: "invited" | "active";
  invitedAt: string;
  activatedAt: string | null;
  // The latest unused invitation link; null once it's used, expired or failed
  // to send.
  inviteExpiresAt: string | null;
  // The name and qualification stamped on reports they sign off (LAB-17).
  signer: LabSigner | null;
};

export type LabSigner = { name: string; title: string };

// "Dr Ayesha Khan, MBBS, FCPS (Chemical Pathology)"
export const signerLine = (signer: LabSigner) =>
  `${signer.name}, ${signer.title}`;

export const isInviteLive = (member: LabStaffMember, now = new Date()) =>
  member.inviteExpiresAt !== null && new Date(member.inviteExpiresAt) > now;

export const labStaffErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can manage staff.",
  not_permitted: "Only the lab admin can manage staff.",
  invalid_role: "Choose a role.",
  staff_limit: `A lab can have up to ${MAX_LAB_STAFF} staff. Remove someone first.`,
  invalid_user: "We couldn't set up this account. Please try again.",
  member_not_found:
    "This person is no longer on your staff list. Refresh the page.",
  cannot_sign: "Only pathologists and the lab admin sign off reports.",
  invalid_signer:
    "Enter a name and a qualification in English letters, as they should print on reports.",
};

export const EMAIL_IN_USE_MESSAGE =
  "This email already has a MedEase account. Ask them for another address.";
