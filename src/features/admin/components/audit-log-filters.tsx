import Link from "next/link";

import { FormField } from "@/components/shared/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { adminRoutes } from "@/config/routes";
import { auditActions, type AuditSearch } from "@/features/admin/lib/audit-log";

// A plain GET form: the filters live in the URL and need no client code.
export function AuditLogFilters({ search }: { search: AuditSearch }) {
  const filtered = Boolean(
    search.user || search.action || search.from || search.to,
  );

  return (
    <form
      action={adminRoutes.auditLog}
      className="grid items-end gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]"
    >
      {search.user && <input type="hidden" name="user" value={search.user} />}
      <FormField id="audit-action" label="Action">
        <NativeSelect
          id="audit-action"
          name="action"
          defaultValue={search.action}
          className="w-full"
        >
          <NativeSelectOption value="">All actions</NativeSelectOption>
          {Object.entries(auditActions).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="audit-from" label="From">
        <Input
          id="audit-from"
          name="from"
          type="date"
          defaultValue={search.from}
        />
      </FormField>
      <FormField id="audit-to" label="To">
        <Input id="audit-to" name="to" type="date" defaultValue={search.to} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit">Filter</Button>
        {filtered && (
          <Link
            href={adminRoutes.auditLog}
            className={buttonVariants({ variant: "outline" })}
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
