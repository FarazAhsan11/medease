import "server-only";

import { getClientIp, hashIdentifier } from "@/lib/request-identity.server";
import { createAdminClient } from "@/lib/supabase/admin";

type SecurityEvent =
  "auth.signed_in" | "auth.password_changed" | "mfa.enrolled" | "mfa.disabled";

// Writes to the audit log with ids and a hashed IP only. A failure is logged and
// never stops the person's action: they've already signed in by this point.
export async function recordSecurityEvent(
  userId: string,
  action: SecurityEvent,
) {
  const { error } = await createAdminClient().rpc("record_security_event", {
    p_actor_id: userId,
    p_action: action,
    p_ip_hash: hashIdentifier(await getClientIp()),
  });

  if (error) console.error("Recording a security event failed:", error.code);
}
