import { SearchIcon } from "lucide-react";

import { DashboardMobileNav } from "@/components/layout/dashboard-mobile-nav";
import { Logo } from "@/components/layout/logo";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { Input } from "@/components/ui/input";
import type { DashboardRole } from "@/config/dashboards";
import type { SessionUser } from "@/lib/auth/session";

type DashboardTopbarProps = {
  role: DashboardRole;
  user: SessionUser;
};

export function DashboardTopbar({ role, user }: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <DashboardMobileNav role={role} />
      <Logo className="lg:hidden" />
      <div className="relative hidden max-w-sm flex-1 md:block">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search"
          placeholder="Search…"
          className="h-9 bg-card pl-9"
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <NotificationsMenu role={role} />
        <UserMenu role={role} name={user.name} email={user.email} />
      </div>
    </header>
  );
}
