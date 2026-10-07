import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Patient dashboard", template: "%s | MedEase" },
};

export default async function PatientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("patient");

  return (
    <DashboardShell role="patient" user={user}>
      {children}
    </DashboardShell>
  );
}
