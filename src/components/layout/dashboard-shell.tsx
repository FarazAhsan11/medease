import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import type { DashboardRole } from "@/config/dashboards";

type DashboardShellProps = {
  role: DashboardRole;
  children: ReactNode;
};

export function DashboardShell({ role, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar role={role} />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
