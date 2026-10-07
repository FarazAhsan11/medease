import { LifeBuoyIcon } from "lucide-react";
import Link from "next/link";

import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Logo } from "@/components/layout/logo";
import { dashboards, type DashboardRole } from "@/config/dashboards";

type DashboardSidebarProps = {
  role: DashboardRole;
};

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {dashboards[role].label} portal
        </p>
        <nav aria-label="Dashboard">
          <DashboardNav role={role} />
        </nav>
      </div>
      <div className="m-3 rounded-xl bg-secondary p-4">
        <LifeBuoyIcon className="size-5 text-primary" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-secondary-foreground">
          Need help?
        </p>
        <p className="mt-0.5 text-xs text-secondary-foreground/80">
          Our support team is available Mon – Sat.
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
        >
          Contact support
        </Link>
      </div>
    </aside>
  );
}
