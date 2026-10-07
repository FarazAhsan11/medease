import { Container } from "@/components/layout/container";
import {
  HeaderAccountActions,
  type HeaderAccount,
} from "@/components/layout/header-account";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { dashboards } from "@/config/dashboards";
import { getSessionUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const user = await getSessionUser();
  const account: HeaderAccount | null = user
    ? { name: user.name, dashboardHref: dashboards[user.role].home }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <NavLinks />
        </nav>

        <div className="hidden lg:block">
          <HeaderAccountActions account={account} />
        </div>

        <div className="lg:hidden">
          <MobileNav account={account} />
        </div>
      </Container>
    </header>
  );
}
