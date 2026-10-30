import "server-only";

import { doctorRoutes } from "@/config/routes";
import {
  verificationApprovedEmail,
  verificationUpdateEmail,
} from "@/features/doctor-verification/emails/verification-email-templates";
import type { ReviewDecision } from "@/features/doctor-verification/lib/verification";
import { getSiteUrl } from "@/lib/env.server";
import { sendMailAfterResponse } from "@/lib/mailer.server";

export function notifyDoctorReviewed(
  decision: ReviewDecision,
  doctorEmail: string | null,
) {
  const siteUrl = getSiteUrl();
  sendMailAfterResponse([
    {
      to: doctorEmail,
      content:
        decision === "approved"
          ? verificationApprovedEmail(
              new URL(doctorRoutes.home, siteUrl).toString(),
            )
          : verificationUpdateEmail(
              new URL(doctorRoutes.verification, siteUrl).toString(),
            ),
    },
  ]);
}
