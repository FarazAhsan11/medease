import "server-only";

import { createHash, randomInt } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const CODE_COUNT = 10;
const GROUP_LENGTH = 5;
// No 0/O, 1/I/L: these get typed from a sheet of paper.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomGroup() {
  return Array.from(
    { length: GROUP_LENGTH },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join("");
}

// Over 49 bits each and limited to a few tries, so a plain hash is enough. The
// user id means two people can never share a hash.
export function hashRecoveryCode(userId: string, code: string) {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(`${userId}:${normalized}`).digest("hex");
}

// Replaces any earlier set. The plain codes exist only in this response.
export async function createRecoveryCodes(userId: string) {
  const codes = Array.from(
    { length: CODE_COUNT },
    () => `${randomGroup()}-${randomGroup()}`,
  );

  const { error } = await createAdminClient().rpc("replace_recovery_codes", {
    p_user_id: userId,
    p_code_hashes: codes.map((code) => hashRecoveryCode(userId, code)),
  });
  if (error) throw new Error(`recovery codes: ${error.message}`);

  return codes;
}
