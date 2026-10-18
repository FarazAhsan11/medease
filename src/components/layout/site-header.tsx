import { Container } from "@/components/layout/container";
import { HeaderAuthActions } from "@/components/layout/header-auth-actions";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { dashboards } from "@/config/dashboards";
import type { SessionUser } from "@/lib/auth/session";

type SiteHeaderProps = {
  user: SessionUser | null;
};

// One header for everyone: guests get the public links, signed-in users get
// their role's links plus notifications and the account menu.
export function SiteHeader({ user }: SiteHeaderProps) {
  const role = user?.role ?? null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo href={role ? dashboards[role].home : "/"} />

        <nav aria-label="Main" className="hidden lg:block">
          <NavLinks role={role} />
        </nav>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              <NotificationsMenu role={user.role} />
              <UserMenu role={user.role} name={user.name} email={user.email} />
            </>
          ) : (
            <div className="hidden lg:block">
              <HeaderAuthActions />
            </div>
          )}
          <div className="lg:hidden">
            <MobileNav role={role} />
          </div>
        </div>
      </Container>
    </header>
  );
}
