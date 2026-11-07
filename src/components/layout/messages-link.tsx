"use client";

import { MessageSquareIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { useUserChannel } from "@/features/messaging/hooks/use-user-channel";
import { queryUnreadCount } from "@/features/messaging/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MessagesLinkProps = {
  userId: string;
  href: string;
  unread: number;
};

// MSG-02: unread messages in the header, kept live from the user's channel:
// up one for each message to them, down by the batch when they read. It counts
// in the database only when the channel connects, to catch up on anything sent
// between the server render and the join, or while the connection was down.
// The header stays mounted across pages, so that's once a page load.
export function MessagesLink({
  userId,
  href,
  unread: initial,
}: MessagesLinkProps) {
  const [unread, setUnread] = useState(initial);
  // The only way into Messages, so it shows where you are like a nav link.
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  useUserChannel(userId, {
    onMessage: (message) => {
      if (message.recipient_id === userId) setUnread((count) => count + 1);
    },
    onRead: (receipt) => {
      if (receipt.reader_id === userId) {
        setUnread((count) => Math.max(count - receipt.count, 0));
      }
    },
    onLive: async () => {
      const count = await queryUnreadCount(createClient(), userId);
      if (count !== null) setUnread(count);
    },
  });

  return (
    <Link
      href={href}
      aria-label={`Messages, ${unread} unread`}
      aria-current={active ? "page" : undefined}
      className={buttonVariants({
        variant: "ghost",
        size: "icon",
        className: cn(
          "relative",
          active && "bg-secondary text-secondary-foreground",
        ),
      })}
    >
      <MessageSquareIcon aria-hidden />
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
