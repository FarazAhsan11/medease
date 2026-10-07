"use client";

import { ChevronDownIcon, LogOutIcon, RepeatIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dashboards, type DashboardRole } from "@/config/dashboards";

type UserMenuProps = {
  role: DashboardRole;
};

const roles = Object.keys(dashboards) as DashboardRole[];

export function UserMenu({ role }: UserMenuProps) {
  const { user, nav, loginHref } = dashboards[role];
  const settings = nav[nav.length - 1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
        <UserAvatar name={user.name} src={user.avatar} className="size-8" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium">
            {user.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {user.subtitle}
          </span>
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem render={<Link href={settings.href} />}>
          <settings.icon />
          {settings.title}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch dashboard (demo)</DropdownMenuLabel>
          {roles
            .filter((option) => option !== role)
            .map((option) => (
              <DropdownMenuItem
                key={option}
                render={<Link href={dashboards[option].home} />}
              >
                <RepeatIcon />
                {dashboards[option].label} dashboard
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          render={<Link href={loginHref} />}
        >
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
