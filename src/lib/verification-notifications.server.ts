import "server-only";

import { getSiteUrl } from "@/lib/env.server";
import { sendMailAfterResponse } from "@/lib/mailer.server";
import { renderEmail } from "@/lib/render-email";
import type { ReviewDecision } from "@/lib/verification";

type RenderedEmail = ReturnType<typeof renderEmail>;

// The admin's note stays behind sign-in, so this only points to the app.
function verificationUpdateEmail(url: string) {
  return renderEmail({
    subject: "An update on your MedEase verification",
    preview: "Sign in to see the details.",
    heading: "An update on your verification",
    paragraphs: [
      "Hi there,",
      "Our team has reviewed your details. Sign in to see the outcome and what happens next.",
    ],
    action: { label: "View verification", url },
  });
}

// Emails a doctor or lab after an admin's decision: the approval email links
// home, anything else links to the verification page.
export function notifyReviewed(
  decision: ReviewDecision,
  email: string | null,
  {
    approvedEmail,
    homePath,
    verificationPath,
  }: {
    approvedEmail: (url: string) => RenderedEmail;
    homePath: string;
    verificationPath: string;
  },
) {
  const url = (path: string) => new URL(path, getSiteUrl()).toString();
  sendMailAfterResponse([
    {
      to: email,
      content:
        decision === "approved"
          ? approvedEmail(url(homePath))
          : verificationUpdateEmail(url(verificationPath)),
    },
  ]);
}
