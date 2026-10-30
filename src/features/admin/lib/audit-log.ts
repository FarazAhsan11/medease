import { z } from "zod";

export const AUDIT_PAGE_SIZE = 50;

// Dates in the filters are clinic time, like the times in the table.
export const AUDIT_TIMEZONE = "Asia/Karachi";

export const auditActions: Record<string, string> = {
  "doctor.documents_submitted": "Sent documents for review",
  "doctor.approved": "Approved a doctor",
  "doctor.needs_info": "Asked a doctor for more information",
  "doctor.rejected": "Rejected a doctor",
};

export type AuditSearch = {
  user: string;
  action: string;
  from: string;
  to: string;
  page: number;
};

const param = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

const date = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

export function parseAuditSearch(
  params: Record<string, string | string[] | undefined>,
): AuditSearch {
  const user = param(params.user);
  const action = param(params.action);
  const page = Number.parseInt(param(params.page), 10);

  return {
    user: z.uuid().safeParse(user).success ? user : "",
    action: action in auditActions ? action : "",
    from: date(param(params.from)),
    to: date(param(params.to)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Ids only: the user filter never puts an email address in the URL.
export function auditHref(basePath: string, search: AuditSearch) {
  const params = new URLSearchParams();
  for (const key of ["user", "action", "from", "to"] as const) {
    if (search[key]) params.set(key, search[key]);
  }
  if (search.page > 1) params.set("page", String(search.page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
