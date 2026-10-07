import { dashboards, type DashboardRole } from "@/config/dashboards";

// Only follow `next` when it points inside the signed-in user's own area,
// which rules out open redirects to other sites or other roles' dashboards.
export function getPostLoginPath(
  role: DashboardRole,
  next: string | null | undefined,
) {
  const { home } = dashboards[role];

  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  if (next === home || next.startsWith(`${home}/`)) return next;

  return home;
}
