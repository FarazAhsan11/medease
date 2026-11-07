import "server-only";

import { doctorRoutes } from "@/config/routes";
import { verificationApprovedEmail } from "@/features/doctor-verification/emails/verification-email-templates";
import type { ReviewDecision } from "@/lib/verification";
import { notifyReviewed } from "@/lib/verification-notifications.server";

export function notifyDoctorReviewed(
  decision: ReviewDecision,
  doctorEmail: string | null,
) {
  notifyReviewed(decision, doctorEmail, {
    approvedEmail: verificationApprovedEmail,
    homePath: doctorRoutes.home,
    verificationPath: doctorRoutes.verification,
  });
}
