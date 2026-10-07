import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

// Each variable is referenced by its full name so Next.js can inline it
// into client bundles. Do not destructure process.env here.
const rawPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

export function hasPublicEnv() {
  return publicEnvSchema.safeParse(rawPublicEnv).success;
}

export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(rawPublicEnv);

  if (!result.success) {
    throw new Error(
      `Missing or invalid Supabase environment variables. Copy .env.example to .env.local and fill in your project values.\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
