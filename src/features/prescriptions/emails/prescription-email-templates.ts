import { siteConfig } from "@/config/site";
import type { Prescription } from "@/features/prescriptions/lib/prescriptions";
import { formatDate } from "@/lib/datetime";
import { renderEmail } from "@/lib/render-email";

// Emails never list the medicines, name the doctor or specialty, or give a
// cancellation reason: inboxes are less private than the app.

export function prescriptionIssuedEmail(
  prescription: Prescription,
  replaced: boolean,
  url: string,
) {
  const date = formatDate(prescription.issuedAt, prescription.timezone);

  return renderEmail({
    subject: replaced
      ? "Your prescription was updated"
      : "Your prescription is ready",
    preview: replaced
      ? "Your prescription has changed. Please check the new version."
      : "Your prescription is ready to view.",
    heading: replaced
      ? "Your prescription was updated"
      : "Your prescription is ready",
    paragraphs: [
      `Hi ${prescription.patientName},`,
      replaced
        ? `Your doctor updated your prescription on ${date}. Please follow the new version from now on; the earlier one no longer applies.`
        : `Your doctor sent you a prescription on ${date}.`,
      `Open it in ${siteConfig.name} to see your medicines, how to take them and for how long. You can print it for your pharmacy.`,
    ],
    action: { label: "View prescription", url },
  });
}

export function prescriptionCancelledEmail(
  prescription: Prescription,
  url: string,
) {
  const date = formatDate(prescription.issuedAt, prescription.timezone);

  return renderEmail({
    subject: "A prescription was cancelled",
    preview: `Your prescription from ${date} was cancelled.`,
    heading: "A prescription was cancelled",
    paragraphs: [
      `Hi ${prescription.patientName},`,
      `Your doctor cancelled the prescription they gave you on ${date}. Stop taking those medicines unless your doctor tells you otherwise.`,
      `Open it in ${siteConfig.name} to see the details. If you have questions, contact your doctor or book a follow-up.`,
    ],
    action: { label: "View prescription", url },
  });
}
