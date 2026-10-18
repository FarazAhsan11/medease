import "server-only";

import {
  confirmSignUpEmail,
  resetPasswordEmail,
} from "@/features/auth/emails/auth-email-templates";
import type { EmailContent } from "@/features/auth/emails/render-email";
import {
  deleteAuthToken,
  issueAuthToken,
  type TokenPurpose,
} from "@/features/auth/lib/auth-tokens";
import { sendMail } from "@/lib/mailer.server";
import { getSiteUrl } from "@/lib/site-url.server";

type Recipient = {
  userId: string;
  email: string;
  name: string | null;
};

export type AuthEmailStatus = "sent" | "cooldown" | "rate_limited";

// Issues a token, builds the link and sends it. If sending fails the token is
// removed, so the user isn't stuck behind the cooldown for nothing.
async function sendTokenEmail(
  { userId, email }: Recipient,
  purpose: TokenPurpose,
  buildLink: (token: string, siteUrl: string) => string,
  buildEmail: (url: string) => EmailContent,
): Promise<AuthEmailStatus> {
  const issued = await issueAuthToken(userId, purpose);
  if (issued.status !== "issued") return issued.status;

  try {
    const url = buildLink(issued.token, await getSiteUrl());
    await sendMail({ to: email, ...buildEmail(url) });
  } catch (error) {
    await deleteAuthToken(issued.id);
    throw error;
  }

  return "sent";
}

export function sendConfirmationEmail(
  recipient: Recipient,
  next?: string | null,
) {
  return sendTokenEmail(
    recipient,
    "email_confirmation",
    (token, siteUrl) => {
      const url = new URL("/auth/confirm", siteUrl);
      url.searchParams.set("token", token);
      if (next) url.searchParams.set("next", next);
      return url.toString();
    },
    (url) => confirmSignUpEmail(recipient.name, url),
  );
}

export function sendPasswordResetEmail(recipient: Recipient) {
  return sendTokenEmail(
    recipient,
    "password_reset",
    (token, siteUrl) => {
      const url = new URL("/reset-password", siteUrl);
      url.searchParams.set("token", token);
      return url.toString();
    },
    (url) => resetPasswordEmail(recipient.name, url),
  );
}
