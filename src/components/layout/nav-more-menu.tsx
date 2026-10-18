import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type NavMoreMenuProps = {
  items: NavItem[];
  activeHref?: string;
};

export function NavMoreMenu({ items, activeHref }: NavMoreMenuProps) {
  const active = items.some((item) => item.href === activeHref);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        More
        <ChevronDownIcon className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {items.map(({ title, href, icon: Icon }) => (
          <DropdownMenuItem
            key={href}
            render={
              <Link
                href={href}
                aria-current={href === activeHref ? "page" : undefined}
              />
            }
          >
            {Icon && <Icon />}
            {title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
