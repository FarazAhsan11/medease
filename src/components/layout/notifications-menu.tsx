"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { BellIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
import { markNotificationsRead } from "@/features/notifications/actions/mark-read";
import {
  NOTIFICATIONS_SHOWN,
  timeAgo,
  toNotification,
  type NotificationFeed,
  type NotificationRow,
} from "@/features/notifications/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NotificationsMenuProps = {
  userId: string;
  feed: NotificationFeed;
};

export function NotificationsMenu({ userId, feed }: NotificationsMenuProps) {
  const [items, setItems] = useState(feed.items);
  const [unread, setUnread] = useState(feed.unread);

  // Row level security decides what this channel receives, so it has to join
  // with the user's token: without setAuth() it joins as anon and is refused.
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let stopped = false;

    async function subscribe() {
      await supabase.realtime.setAuth();
      if (stopped) return;

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const notification = toNotification(payload.new as NotificationRow);
            setItems((current) =>
              [notification, ...current].slice(0, NOTIFICATIONS_SHOWN),
            );
            setUnread((count) => count + 1);
          },
        )
        .subscribe();
    }

    void subscribe();

    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  function markOneRead(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item?.unread) return;

    setItems((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, unread: false } : candidate,
      ),
    );
    setUnread((count) => Math.max(count - 1, 0));
    void markNotificationsRead(id);
  }

  function markAllRead() {
    setItems((current) =>
      current.map((candidate) => ({ ...candidate, unread: false })),
    );
    setUnread(0);
    void markNotificationsRead();
  }

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
      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
            Notifications
            <span className="font-normal">{unread} unread</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing new yet.
          </p>
        ) : (
          items.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              render={<Link href={notification.href} />}
              onClick={() => markOneRead(notification.id)}
              className="items-start gap-3 px-2 py-2"
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  notification.unread ? "bg-primary" : "bg-transparent",
                )}
              />
              <span className="grid gap-0.5">
                <span className="text-sm leading-snug">
                  {notification.title}
                  {notification.unread && (
                    <span className="sr-only"> (unread)</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(notification.createdAt)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        {unread > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={markAllRead}
              className="justify-center text-sm"
            >
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
