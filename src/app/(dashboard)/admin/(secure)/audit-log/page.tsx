import { ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { adminRoutes } from "@/config/routes";
import { AuditLogFilters } from "@/features/admin/components/audit-log-filters";
import { AuditLogTable } from "@/features/admin/components/audit-log-table";
import { listAuditLog } from "@/features/admin/data/audit-log";
import {
  AUDIT_PAGE_SIZE,
  auditHref,
  parseAuditSearch,
} from "@/features/admin/lib/audit-log";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Audit log",
};

export default async function AdminAuditLogPage({
  searchParams,
}: PageProps<"/admin/audit-log">) {
  await requireAdmin();
  const search = parseAuditSearch(await searchParams);
  const { entries, total } = await listAuditLog(search);
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  return (
    <>
      <DashboardPageHeader
        title="Audit log"
        description={`${total} ${total === 1 ? "entry" : "entries"}. Entries can't be changed or deleted.`}
      />
      <AuditLogFilters search={search} />
      {entries.length > 0 ? (
        <AuditLogTable entries={entries} search={search} />
      ) : (
        <EmptyState
          icon={ScrollTextIcon}
          title="Nothing found"
          description="No entries match these filters."
        />
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {search.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {search.page > 1 && (
              <Link
                href={auditHref(adminRoutes.auditLog, {
                  ...search,
                  page: search.page - 1,
                })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Previous
              </Link>
            )}
            {search.page < totalPages && (
              <Link
                href={auditHref(adminRoutes.auditLog, {
                  ...search,
                  page: search.page + 1,
                })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
