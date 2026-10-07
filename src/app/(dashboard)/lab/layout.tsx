import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Lab dashboard", template: "%s | MedEase" },
};

export default async function LabLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("lab");

  return (
    <DashboardShell role="lab" user={user}>
      {children}
    </DashboardShell>
  );
}
