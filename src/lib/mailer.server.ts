import "server-only";

import { after } from "next/server";
import { createTransport } from "nodemailer";

import { getEmailEnv } from "@/lib/env.server";
import type { EmailContent } from "@/lib/render-email";

type Message = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: ReturnType<typeof createTransport> | undefined;

// One pooled SMTP connection per server process, so only the first email
// pays for connecting and logging in.
function getTransporter() {
  if (transporter) return transporter;

  const env = getEmailEnv();
  transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    pool: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }: Message) {
  try {
    await getTransporter().sendMail({
      from: getEmailEnv().EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    logSendFailure(subject, error);
    throw error;
  }
}

type Mail = { to: string | null; content: EmailContent };

// Sends after the response, so a slow SMTP server never delays the action
// that triggered the email. A failed email is logged (by sendMail) and never
// undoes that action. Mails without a recipient are skipped.
export function sendMailAfterResponse(mails: Mail[]) {
  after(async () => {
    await Promise.allSettled(
      mails
        .filter((mail): mail is Mail & { to: string } => Boolean(mail.to))
        .map((mail) => sendMail({ to: mail.to, ...mail.content })),
    );
  });
}

// Nodemailer messages can include recipient addresses, so log codes only.
function logSendFailure(subject: string, error: unknown) {
  const { code, responseCode } = (error ?? {}) as {
    code?: string;
    responseCode?: number;
  };
  const hint =
    code === "EAUTH"
      ? " Check SMTP_USER and SMTP_PASSWORD (Gmail needs an App Password)."
      : code === "ECONNECTION" || code === "ETIMEDOUT"
        ? " Check SMTP_HOST and SMTP_PORT."
        : "";

  console.error(
    `Sending "${subject}" failed (${code ?? "unknown"}${responseCode ? ` ${responseCode}` : ""}).${hint}`,
  );
}
