import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC-SHA256 over "<timestamp>.<raw body>", sent as "t=<seconds>,v1=<hex>".
// The timestamp is signed too, so a captured request can't be replayed with a
// fresh one, and one older than five minutes is refused.
const TOLERANCE_SECONDS = 300;

function digest(secret: string, timestamp: number, payload: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

export function signPayload(
  secret: string,
  payload: string,
  timestamp = Math.floor(Date.now() / 1000),
) {
  return `t=${timestamp},v1=${digest(secret, timestamp, payload)}`;
}

export function verifySignature(
  secret: string,
  payload: string,
  header: string | null,
  now = Math.floor(Date.now() / 1000),
) {
  if (!header) return false;

  const parts = new Map(
    header.split(",").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
    }),
  );
  const timestamp = Number(parts.get("t"));
  const given = parts.get("v1") ?? "";
  if (!Number.isInteger(timestamp) || !/^[0-9a-f]{64}$/.test(given)) {
    return false;
  }
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(digest(secret, timestamp, payload), "hex");
  return timingSafeEqual(expected, Buffer.from(given, "hex"));
}

// A signed token for a URL: "<base64url payload>.<hex signature>". No expiry
// of its own: the payload carries one.
export function signToken(secret: string, payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${signature}`;
}

export function readToken(secret: string, token: string): unknown {
  const [body, given] = token.split(".");
  if (!body || !given || !/^[0-9a-f]{64}$/.test(given)) return null;

  const expected = createHmac("sha256", secret).update(body).digest();
  if (!timingSafeEqual(expected, Buffer.from(given, "hex"))) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
