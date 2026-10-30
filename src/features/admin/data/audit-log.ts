import "server-only";

import {
  AUDIT_PAGE_SIZE,
  type AuditSearch,
} from "@/features/admin/lib/audit-log";
import { createClient } from "@/lib/supabase/server";

export type AuditEntry = {
  id: number;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  targetId: string | null;
  targetEmail: string | null;
  createdAt: string;
};

type AuditRow = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_id: string | null;
  target_email: string | null;
  created_at: string;
  total: number;
};

const KARACHI_OFFSET = "+05:00";

// admin_audit_log refuses anyone but an admin who passed their second factor.
export async function listAuditLog(search: AuditSearch) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_audit_log", {
    p_user_id: search.user || null,
    p_action: search.action || null,
    p_from: search.from ? `${search.from}T00:00:00${KARACHI_OFFSET}` : null,
    p_to: search.to ? `${search.to}T23:59:59.999${KARACHI_OFFSET}` : null,
    p_limit: AUDIT_PAGE_SIZE,
    p_offset: (search.page - 1) * AUDIT_PAGE_SIZE,
  });

  if (error) throw new Error(`admin_audit_log: ${error.message}`);

  const rows = data as AuditRow[];
  const entries: AuditEntry[] = rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    action: row.action,
    targetId: row.target_id,
    targetEmail: row.target_email,
    createdAt: row.created_at,
  }));

  return { entries, total: rows[0]?.total ?? 0 };
}
