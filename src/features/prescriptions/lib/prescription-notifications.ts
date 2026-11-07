import "server-only";

import { patientRoutes } from "@/config/routes";
import {
  prescriptionCancelledEmail,
  prescriptionIssuedEmail,
} from "@/features/prescriptions/emails/prescription-email-templates";
import { wantsEmail } from "@/features/notifications/lib/email-preferences.server";
import type { Prescription } from "@/features/prescriptions/lib/prescriptions";
import { getSiteUrl } from "@/lib/env.server";
import { sendMailAfterResponse } from "@/lib/mailer.server";

function prescriptionUrl(prescription: Prescription) {
  return new URL(
    patientRoutes.prescription(prescription.id),
    getSiteUrl(),
  ).toString();
}

// The bell always has it; the email is the patient's choice.
const patientWants = (prescription: Prescription) => () =>
  wantsEmail(prescription.patientId, "prescriptions");

export function notifyPrescriptionIssued(
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
        prescriptionUrl(prescription),
      ),
      wanted: patientWants(prescription),
    },
  ]);
}

export function notifyPrescriptionCancelled(
  prescription: Prescription,
  patientEmail: string | null,
) {
  sendMailAfterResponse([
    {
      to: patientEmail,
      content: prescriptionCancelledEmail(
        prescription,
        prescriptionUrl(prescription),
      ),
      wanted: patientWants(prescription),
    },
  ]);
}
