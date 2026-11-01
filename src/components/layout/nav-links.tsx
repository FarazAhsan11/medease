"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavMoreMenu } from "@/components/layout/nav-more-menu";
import { dashboards, type DashboardRole } from "@/config/dashboards";
import { getHeaderNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  role: DashboardRole | null;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
};

// The longest matching href wins. The home link only matches itself, so
// "Overview" isn't lit on pages with no link of their own, like Settings.
function getActiveHref(pathname: string, hrefs: string[], home: string) {
  return hrefs
    .filter(
      (href) =>
        pathname === href || (href !== home && pathname.startsWith(`${href}/`)),
    )
    .sort((a, b) => b.length - a.length)[0];
}

export function NavLinks({
  role,
  orientation = "horizontal",
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname();
  const { links, more } = getHeaderNav(role);
  const vertical = orientation === "vertical";
  const items = vertical ? [...links, ...more] : links;
  const activeHref = getActiveHref(
    pathname,
    [...links, ...more].map((item) => item.href),
    role ? dashboards[role].home : "/",
  );

  return (
    <ul
      className={cn("flex", vertical ? "flex-col gap-1" : "items-center gap-1")}
    >
      {items.map(({ title, href, icon: Icon }) => {
        const active = href === activeHref;

        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {vertical && Icon && (
                <Icon className="size-4 shrink-0" aria-hidden />
              )}
              {title}
            </Link>
          </li>
        );
      })}
      {!vertical && more.length > 0 && (
        <li>
          <NavMoreMenu items={more} activeHref={activeHref} />
        </li>
      )}
    </ul>
  );
}
