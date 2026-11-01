import "server-only";

import { after } from "next/server";

import {
  confirmSignUpEmail,
  resetPasswordEmail,
} from "@/features/auth/emails/auth-email-templates";
import {
  deleteAuthToken,
  issueAuthToken,
  type TokenPurpose,
} from "@/features/auth/lib/auth-tokens";
import { getSiteUrl } from "@/lib/env.server";
import { sendMail } from "@/lib/mailer.server";
import type { EmailContent } from "@/lib/render-email";

type Recipient = {
  userId: string;
  email: string;
  name: string | null;
};

export type AuthEmailStatus = "sent" | "cooldown" | "rate_limited";

// Issues a token and emails the link after the response, because SMTP can take
// seconds and the person would be left waiting on the form. If sending fails
// (sendMail logs it) the token is removed, so the user isn't stuck behind the
// cooldown and "Resend" works straight away.
async function sendTokenEmail(
  { userId, email }: Recipient,
  purpose: TokenPurpose,
  buildLink: (token: string, siteUrl: string) => string,
  buildEmail: (url: string) => EmailContent,
): Promise<AuthEmailStatus> {
  const issued = await issueAuthToken(userId, purpose);
  if (issued.status !== "issued") return issued.status;

  const content = buildEmail(buildLink(issued.token, getSiteUrl()));
  after(async () => {
    try {
      await sendMail({ to: email, ...content });
    } catch {
      await deleteAuthToken(issued.id);
    }
  });

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
