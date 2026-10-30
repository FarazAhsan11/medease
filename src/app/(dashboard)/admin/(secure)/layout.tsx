import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth/session";

// Everything here needs the second factor; the two-factor page sits outside.
export default async function SecureAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return children;
}
