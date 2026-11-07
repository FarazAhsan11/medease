import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import type { Conversation } from "@/features/messaging/lib/messaging";
import { timeAgo } from "@/features/notifications/lib/notifications";
import { cn } from "@/lib/utils";

type ConversationListItemProps = {
  conversation: Conversation;
  href: string;
  active?: boolean;
  compact?: boolean;
};

export function ConversationListItem({
  conversation,
  href,
  active = false,
  compact = false,
}: ConversationListItemProps) {
  const { otherName, lastBody, lastFromMe, lastMessageAt, unread } =
    conversation;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 px-5 text-left transition-colors",
        compact ? "py-3.5" : "py-4",
        active ? "bg-secondary/60" : "hover:bg-muted/60",
      )}
    >
      <UserAvatar name={otherName} className={compact ? "size-8" : undefined} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "truncate text-sm",
              unread > 0 ? "font-semibold" : "font-medium",
            )}
          >
            {otherName}
          </span>
          {lastMessageAt && (
            <span
              className="shrink-0 text-xs text-muted-foreground"
              suppressHydrationWarning
            >
              {timeAgo(lastMessageAt)}
            </span>
          )}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-muted-foreground",
            compact ? "text-xs" : "text-sm",
            unread > 0 && "text-foreground",
          )}
        >
          {lastBody
            ? `${lastFromMe ? "You: " : ""}${lastBody}`
            : "No messages yet"}
        </span>
      </span>
      {unread > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
          {unread}
          <span className="sr-only"> unread</span>
        </span>
      )}
    </Link>
  );
}
