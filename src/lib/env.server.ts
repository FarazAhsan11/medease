import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Missing or invalid server environment variables. Add them to .env.local.\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

// Base URL for links in emails. Always from config, never from request
// headers, so a forged Host header can't point a reset link at another site.
// https only, except localhost for development.
const siteUrlSchema = z.url({ protocol: /^https?$/ }).refine(
  (value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  },
  { message: "Use https (http only for localhost)" },
);

const DEV_SITE_URL = "http://localhost:3000";

// Required in production: instrumentation.ts checks it at startup.
export function getSiteUrl(): string {
  const value = process.env.SITE_URL;
  if (!value && process.env.NODE_ENV !== "production") return DEV_SITE_URL;

  const result = siteUrlSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Missing or invalid SITE_URL, the public address used in email links (e.g. https://medease.pk).\n${z.prettifyError(result.error)}`,
    );
  }

  return new URL(result.data).origin;
}

// Separate from getServerEnv so a missing SMTP setup only breaks email, not
// every server feature.
const emailEnvSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
});

export type EmailEnv = z.infer<typeof emailEnvSchema>;

export function getEmailEnv(): EmailEnv {
  const result = emailEnvSchema.safeParse({
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  if (!result.success) {
    throw new Error(
      `Missing or invalid email environment variables. Add them to .env.local.\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

// Optional TURN relay for video calls on networks that block direct
// connections. Without it calls use free public STUN servers only.
const turnEnvSchema = z.object({
  TURN_URLS: z.string().min(1),
  TURN_USERNAME: z.string().min(1),
  TURN_CREDENTIAL: z.string().min(1),
});

export function getTurnEnv() {
  const result = turnEnvSchema.safeParse({
    TURN_URLS: process.env.TURN_URLS,
    TURN_USERNAME: process.env.TURN_USERNAME,
    TURN_CREDENTIAL: process.env.TURN_CREDENTIAL,
  });

  return result.success ? result.data : null;
}
