import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRoutes } from "@/config/routes";
import type { AuditEntry } from "@/features/admin/data/audit-log";
import {
  auditActions,
  auditHref,
  AUDIT_TIMEZONE,
  type AuditSearch,
} from "@/features/admin/lib/audit-log";
import { formatDateTime } from "@/lib/datetime";

type AuditLogTableProps = {
  entries: AuditEntry[];
  search: AuditSearch;
};

// Each person links to everything they did or had done to them.
function UserLink({
  id,
  email,
  search,
}: {
  id: string | null;
  email: string | null;
  search: AuditSearch;
}) {
  if (!id) return <span className="text-muted-foreground">System</span>;

  return (
    <Link
      href={auditHref(adminRoutes.auditLog, { ...search, user: id, page: 1 })}
      className="text-primary hover:underline"
    >
      {email ?? "Deleted account"}
    </Link>
  );
}

export function AuditLogTable({ entries, search }: AuditLogTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">When</TableHead>
            <TableHead>Who</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="hidden pr-5 md:table-cell">Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="pl-5 whitespace-nowrap">
                {formatDateTime(entry.createdAt, AUDIT_TIMEZONE)}
              </TableCell>
              <TableCell>
                <UserLink
                  id={entry.actorId}
                  email={entry.actorEmail}
                  search={search}
                />
                {entry.actorRole && (
                  <p className="text-xs text-muted-foreground">
                    {entry.actorRole}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {auditActions[entry.action] ?? entry.action}
              </TableCell>
              <TableCell className="hidden pr-5 md:table-cell">
                {entry.targetId && (
                  <UserLink
                    id={entry.targetId}
                    email={entry.targetEmail}
                    search={search}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
