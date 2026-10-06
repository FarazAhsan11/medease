import { AccountLink } from "@/components/layout/account-link";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinkItem } from "@/components/layout/nav-link-item";
import { mainNav } from "@/config/navigation";

export function SiteHeader() {
  return (
    <nav className="flex flex-col justify-between bg-surface px-[150px] pt-4 pb-5 text-ink max-nav:w-full max-nav:p-4">
      <div className="flex items-center justify-between px-5 py-2.5 max-nav:hidden">
        <Logo />
        <AccountLink />
      </div>

      <hr className="my-2.5 border-0 border-t-[0.3px] border-line-divider max-nav:hidden" />

      <div className="flex justify-center max-nav:hidden">
        <ul className="flex">
          {mainNav.map((item) => (
            <NavLinkItem key={item.href} href={item.href} title={item.title} />
          ))}
        </ul>
      </div>

      <MobileNav />
    </nav>
  );
}
