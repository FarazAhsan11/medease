import "server-only";

import { patientRoutes } from "@/config/routes";
import {
  prescriptionCancelledEmail,
  prescriptionIssuedEmail,
} from "@/features/prescriptions/emails/prescription-email-templates";
import type { Prescription } from "@/features/prescriptions/lib/prescriptions";
import { sendMailAfterResponse } from "@/lib/mailer.server";
import { getSiteUrl } from "@/lib/site-url.server";

async function prescriptionUrl(prescription: Prescription) {
  const siteUrl = await getSiteUrl();
  return new URL(
    patientRoutes.prescription(prescription.id),
    siteUrl,
  ).toString();
}

export async function notifyPrescriptionIssued(
  prescription: Prescription,
  patientEmail: string | null,
  replaced: boolean,
) {
  sendMailAfterResponse([
    {
      to: patientEmail,
      content: prescriptionIssuedEmail(
        prescription,
        replaced,
        await prescriptionUrl(prescription),
      ),
    },
  ]);
}

export async function notifyPrescriptionCancelled(
  prescription: Prescription,
  patientEmail: string | null,
) {
  sendMailAfterResponse([
    {
      to: patientEmail,
      content: prescriptionCancelledEmail(
        prescription,
        await prescriptionUrl(prescription),
      ),
    },
  ]);
}
