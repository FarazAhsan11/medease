import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: { default: "Patient dashboard", template: "%s | MedEase" },
};

export default function PatientLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="patient">{children}</DashboardShell>;
}
