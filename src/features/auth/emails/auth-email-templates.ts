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
