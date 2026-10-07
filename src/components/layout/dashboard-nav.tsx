"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboards, type DashboardRole } from "@/config/dashboards";
import { cn } from "@/lib/utils";

type DashboardNavProps = {
  role: DashboardRole;
  onNavigate?: () => void;
};

export function DashboardNav({ role, onNavigate }: DashboardNavProps) {
  const pathname = usePathname();
  const { home, nav } = dashboards[role];

  return (
    <ul className="grid gap-0.5">
      {nav.map(({ title, href, icon: Icon }) => {
        const active =
          href === home ? pathname === href : pathname.startsWith(href);

        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
