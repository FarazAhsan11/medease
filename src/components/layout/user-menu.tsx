"use client";

import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

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
import { signOut } from "@/features/auth/actions/sign-out";

type UserMenuProps = {
  role: DashboardRole;
  name: string;
  email: string;
};

export function UserMenu({ role, name, email }: UserMenuProps) {
  const { label, nav } = dashboards[role];
  const settings = nav[nav.length - 1];
  const [signingOut, startSignOut] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
        <UserAvatar name={name} className="size-8" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium">
            {name}
          </span>
          <span className="block text-xs text-muted-foreground">{label}</span>
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid px-2 py-1.5">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="truncate font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={settings.href} />}>
          <settings.icon />
          {settings.title}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onClick={() => startSignOut(() => signOut())}
        >
          <LogOutIcon />
          {signingOut ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
