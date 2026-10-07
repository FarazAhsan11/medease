"use client";

import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type NotificationsMenuProps = {
  role: DashboardRole;
};

export function NotificationsMenu({ role }: NotificationsMenuProps) {
  const { notifications } = dashboards[role];
  const unread = notifications.filter((item) => item.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications, ${unread} unread`}
            className="relative"
          />
        }
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-background bg-destructive" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
            Notifications
            <span className="font-normal">{unread} unread</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="items-start gap-3 px-2 py-2"
          >
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                notification.unread ? "bg-primary" : "bg-transparent",
              )}
            />
            <span className="grid gap-0.5">
              <span className="text-sm leading-snug">{notification.title}</span>
              <span className="text-xs text-muted-foreground">
                {notification.time}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
