import { siteConfig } from "@/config/site";
import type { Prescription } from "@/features/prescriptions/lib/prescriptions";
import { formatDate } from "@/lib/datetime";
import { renderEmail } from "@/lib/render-email";

// Emails never list the medicines: inboxes are less private than the app.

export function prescriptionIssuedEmail(
  prescription: Prescription,
  replaced: boolean,
  url: string,
) {
  const date = formatDate(prescription.issuedAt, prescription.timezone);

  return renderEmail({
    subject: replaced
      ? `${prescription.doctorName} updated your prescription`
      : `New prescription from ${prescription.doctorName}`,
    preview: replaced
      ? "Your prescription has changed. Please check the new version."
      : "Your prescription is ready to view.",
    heading: replaced
      ? "Your prescription was updated"
      : "Your prescription is ready",
    paragraphs: [
      `Hi ${prescription.patientName},`,
      replaced
        ? `${prescription.doctorName} updated your prescription on ${date}. Please follow the new version from now on; the earlier one no longer applies.`
        : `${prescription.doctorName} (${prescription.doctorSpecialization}) sent you a prescription on ${date}.`,
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
    subject: `${prescription.doctorName} cancelled a prescription`,
    preview: `Your prescription from ${date} was cancelled.`,
    heading: "A prescription was cancelled",
    paragraphs: [
      `Hi ${prescription.patientName},`,
      `${prescription.doctorName} cancelled the prescription they gave you on ${date}. Stop taking those medicines unless your doctor tells you otherwise.`,
      ...(prescription.cancellationReason
        ? [`Reason: ${prescription.cancellationReason}`]
        : []),
      "If you have questions, contact your doctor or book a follow-up.",
    ],
    action: { label: "View prescription", url },
  });
}
