import "server-only";

import { createHmac } from "node:crypto";

import { headers } from "next/headers";

import { getServerEnv } from "@/lib/env.server";

// Keyed, because an IPv4 address has so few possible values that a plain hash
// could be reversed by trying them all.
export function hashIdentifier(value: string) {
  return createHmac("sha256", getServerEnv().SUPABASE_SECRET_KEY)
    .update(value)
    .digest("hex");
}

// Vercel sets this header itself, so the first address is the real client.
export async function getClientIp() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");

  return (
    forwarded?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown"
  );
}
