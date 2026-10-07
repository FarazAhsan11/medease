import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: { default: "Doctor dashboard", template: "%s | MedEase" },
};

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="doctor">{children}</DashboardShell>;
}
