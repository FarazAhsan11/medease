import "server-only";

import { labRoutes } from "@/config/routes";
import { labVerifiedEmail } from "@/features/lab-verification/emails/lab-verification-email-templates";
import type { ReviewDecision } from "@/lib/verification";
import { notifyReviewed } from "@/lib/verification-notifications.server";

export function notifyLabReviewed(
  decision: ReviewDecision,
  labEmail: string | null,
) {
  notifyReviewed(decision, labEmail, {
    approvedEmail: labVerifiedEmail,
    homePath: labRoutes.home,
    verificationPath: labRoutes.verification,
  });
}
