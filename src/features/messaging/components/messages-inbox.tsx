"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { ConversationList } from "@/features/messaging/components/conversation-list";
import type {
  Conversation,
  MessagingRole,
} from "@/features/messaging/lib/messaging";
import { cn } from "@/lib/utils";

type MessagesInboxProps = {
  userId: string;
  role: MessagingRole;
  conversations: Conversation[];
  description: string;
  // The open conversation, or a prompt to pick one.
  children: ReactNode;
};

// Fills the screen below the site header, so the conversation scrolls inside
// it and the box to write in never leaves the screen. The list stays mounted
// (and subscribed) while the reader moves between conversations. On a phone,
// one column shows at a time.
export function MessagesInbox({
  userId,
  role,
  conversations,
  description,
  children,
}: MessagesInboxProps) {
  const open = Boolean(useParams<{ conversationId?: string }>().conversationId);

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[28rem] overflow-hidden rounded-2xl border bg-card lg:h-[calc(100dvh-8rem)]">
      <aside
        className={cn(
          "w-full min-w-0 flex-col lg:flex lg:w-80 lg:shrink-0 lg:border-r",
          open ? "hidden" : "flex",
        )}
      >
        <div className="border-b px-5 py-4">
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            userId={userId}
            role={role}
            conversations={conversations}
          />
        </div>
      </aside>
      <div
        className={cn(
          "min-w-0 flex-1 flex-col lg:flex",
          open ? "flex" : "hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
