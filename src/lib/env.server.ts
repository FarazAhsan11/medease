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
