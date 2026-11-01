import type { ReactNode } from "react";

import { NavigationProgress } from "@/components/layout/navigation-progress";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FlashToaster } from "@/components/providers/flash-toaster";
import { getNotifications } from "@/features/notifications/data/notifications";
import { getSessionUser } from "@/lib/auth/session";
import { getFlash } from "@/lib/flash.server";

type AppShellProps = {
  children: ReactNode;
};

// The single layout for every page, signed in or not, so the UI never
// switches shells when someone logs in.
export async function AppShell({ children }: AppShellProps) {
  const [user, flash] = await Promise.all([getSessionUser(), getFlash()]);
  const notifications = user ? await getNotifications(user.id) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <NavigationProgress />
      <div className="contents print:hidden">
        <SiteHeader user={user} notifications={notifications} />
      </div>
      <main className="flex-1">{children}</main>
      <div className="contents print:hidden">
        <SiteFooter compact={Boolean(user)} />
      </div>
      <FlashToaster flash={flash} />
    </div>
  );
}
