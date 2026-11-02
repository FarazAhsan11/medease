import "server-only";

import { timingSafeEqual } from "node:crypto";

import { getCronSecret } from "@/lib/env.server";

// Scheduled routes are called by pg_cron with this bearer token. With no secret
// configured they refuse everyone.
export function isCronAuthorized(request: Request) {
  const secret = getCronSecret();
  if (!secret) return false;

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);

  return given.length === expected.length && timingSafeEqual(given, expected);
}
