import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Doctor dashboard", template: "%s | MedEase" },
};

export default async function DoctorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("doctor");

  return (
    <DashboardShell role="doctor" user={user}>
      {children}
    </DashboardShell>
  );
}
