import { Container } from "@/components/layout/container";
import { HeaderAuthActions } from "@/components/layout/header-auth-actions";
import { Logo } from "@/components/layout/logo";
import { MessagesLink } from "@/components/layout/messages-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { dashboards } from "@/config/dashboards";
import { messagesRoutes } from "@/features/messaging/lib/messaging";
import type { NotificationFeed } from "@/features/notifications/lib/notifications";
import type { SessionUser } from "@/lib/auth/session";

type SiteHeaderProps = {
  user: SessionUser | null;
  notifications: NotificationFeed | null;
  // Patients and doctors only.
  unreadMessages: number | null;
};

// One header for everyone: guests get the public links, signed-in users get
// their role's links plus notifications and the account menu.
export function SiteHeader({
  user,
  notifications,
  unreadMessages,
}: SiteHeaderProps) {
  const role = user?.role ?? null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo href={role ? dashboards[role].home : "/"} />

        <nav aria-label="Main" className="hidden lg:block">
          <NavLinks role={role} labRole={user?.labRole} />
        </nav>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              {unreadMessages !== null &&
                (user.role === "patient" || user.role === "doctor") && (
                  <MessagesLink
                    // Keyed so a different account never inherits this one's
                    // count; distinct from the bell's key beside it.
                    key={`messages:${user.id}`}
                    userId={user.id}
                    href={messagesRoutes[user.role].inbox}
                    unread={unreadMessages}
                  />
                )}
              {notifications && (
                // Keyed so a different account never inherits this one's bell.
                <NotificationsMenu
                  key={user.id}
                  userId={user.id}
                  feed={notifications}
                />
              )}
              <UserMenu
                role={user.role}
                labRole={user.labRole}
                name={user.name}
                email={user.email}
              />
            </>
          ) : (
            <div className="hidden lg:block">
              <HeaderAuthActions />
            </div>
          )}
          <div className="lg:hidden">
            <MobileNav role={role} labRole={user?.labRole} />
          </div>
        </div>
      </Container>
    </header>
  );
}
