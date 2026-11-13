import { renderEmail } from "@/lib/render-email";

const greeting = (name: string | null) => (name ? `Hi ${name},` : "Hi there,");

const IGNORE_IF_NOT_YOU =
  "If you didn't ask for this, you can safely ignore this email. Your account stays as it is.";

export function confirmSignUpEmail(name: string | null, url: string) {
  return renderEmail({
    subject: "Confirm your MedEase account",
    preview: "One click to activate your account.",
    heading: "Confirm your email",
    paragraphs: [
      greeting(name),
      "Thanks for joining MedEase. Confirm your email address to activate your account. The link expires in 24 hours.",
    ],
    action: { label: "Confirm email", url },
    footnote:
      "If you didn't create a MedEase account, you can safely ignore this email.",
  });
}

// Names the lab and the role, which the invitee needs to trust the link, but
// nothing about patients; the subject names no one.
export function labInviteEmail(
  name: string | null,
  labName: string,
  roleLabel: string,
  url: string,
) {
  return renderEmail({
    subject: "You're invited to join a lab on MedEase",
    preview: "Set a password to start.",
    heading: "Join your lab on MedEase",
    paragraphs: [
      greeting(name),
      `${labName} has added you to its team on MedEase as ${roleLabel}. Set a password to start. You'll also pair an authenticator app, because lab accounts handle patient information. The link expires in 7 days and works once.`,
    ],
    action: { label: "Set your password", url },
    footnote:
      "If you don't work for this lab, you can safely ignore this email. No account is used until you set a password.",
  });
}

export function resetPasswordEmail(name: string | null, url: string) {
  return renderEmail({
    subject: "Reset your MedEase password",
    preview: "Use this link to choose a new password.",
    heading: "Reset your password",
    paragraphs: [
      greeting(name),
      "We received a request to reset the password for your MedEase account. Use the button below to choose a new one. The link expires in 1 hour and works once.",
    ],
    action: { label: "Choose a new password", url },
    footnote: IGNORE_IF_NOT_YOU,
  });
}
