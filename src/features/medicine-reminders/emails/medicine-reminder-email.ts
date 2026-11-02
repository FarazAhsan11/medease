import { siteConfig } from "@/config/site";
import {
  doseTimeLabels,
  type DoseTime,
} from "@/features/prescriptions/lib/prescriptions";
import { renderEmail } from "@/lib/render-email";

type MedicineReminderUrls = {
  // Where the patient sees what to take.
  medicines: string;
  unsubscribe: string;
};

// Never lists the medicines or how much to take: inboxes are less private than the
// app, so the details stay behind sign-in.
export function medicineReminderEmail(
  reminder: { patient_name: string; dose_time: DoseTime },
  urls: MedicineReminderUrls,
) {
  const time = doseTimeLabels[reminder.dose_time].toLowerCase();
  const heading = `Time for your ${time} medicines`;

  return renderEmail({
    subject: heading,
    preview: `Open ${siteConfig.name} to see what's due.`,
    heading,
    paragraphs: [
      `Hi ${reminder.patient_name},`,
      `It's time for your ${time} medicines. Sign in to ${siteConfig.name} to see what to take and how to take it.`,
    ],
    action: { label: "See my medicines", url: urls.medicines },
    footnote:
      "You're getting this email because you turned on medicine reminders.",
    footerLink: { label: "Turn off these reminders", url: urls.unsubscribe },
  });
}
