import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: { default: "Lab dashboard", template: "%s | MedEase" },
};

export default function LabLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="lab">{children}</DashboardShell>;
}
