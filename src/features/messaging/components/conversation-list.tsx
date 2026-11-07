"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversationListItem } from "@/features/messaging/components/conversation-list-item";
import { useUserChannel } from "@/features/messaging/hooks/use-user-channel";
import {
  messagesRoutes,
  withLiveMessage,
  type Conversation,
  type MessagingRole,
} from "@/features/messaging/lib/messaging";
import { queryConversations } from "@/features/messaging/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ConversationListProps = {
  userId: string;
  role: MessagingRole;
  conversations: Conversation[];
  // The doctor overview shows the latest few in a smaller style.
  compact?: boolean;
  limit?: number;
  className?: string;
};

// Live from the user's channel: a message moves its conversation to the top
// with one more unread, and reading clears the count. A conversation the list
// doesn't have yet is fetched on its own; the whole list is loaded again only
// after a dropped connection.
export function ConversationList({
  userId,
  role,
  conversations,
  compact = false,
  limit,
  className,
}: ConversationListProps) {
  const [items, setItems] = useState(conversations);
  // Updated as events arrive, ahead of the render, so two quick messages to a
  // new conversation fetch it once.
  const known = useRef(new Set(conversations.map((item) => item.id)));
  const params = useParams<{ conversationId?: string }>();
  const activeId = params.conversationId;

  const reload = useCallback(async () => {
    const next = await queryConversations(createClient(), role, { limit });
    if (!next) return;
    known.current = new Set(next.map((item) => item.id));
    setItems(next);
  }, [role, limit]);

  const loadOne = useCallback(
    async (conversationId: string) => {
      known.current.add(conversationId);
      const [conversation] =
        (await queryConversations(createClient(), role, { conversationId })) ??
        [];
      if (!conversation) {
        known.current.delete(conversationId);
        return;
      }
      setItems((current) => [
        conversation,
        ...current.filter((item) => item.id !== conversation.id),
      ]);
    },
    [role],
  );

  useUserChannel(userId, {
    onMessage: (message) => {
      if (!known.current.has(message.conversation_id)) {
        void loadOne(message.conversation_id);
        return;
      }
      setItems(
        (current) => withLiveMessage(current, message, userId) ?? current,
      );
    },
    onRead: (receipt) => {
      if (receipt.reader_id !== userId) return;
      setItems((current) =>
        current.map((item) =>
          item.id === receipt.conversation_id ? { ...item, unread: 0 } : item,
        ),
      );
    },
    onLive: (when) => {
      if (when === "reconnect") void reload();
    },
  });

  // A conversation opened from an appointment has no messages yet, so no
  // event announces it.
  const missingActive =
    activeId !== undefined && !items.some((item) => item.id === activeId);
  useEffect(() => {
    if (!missingActive || !activeId || known.current.has(activeId)) return;
    const timer = setTimeout(() => void loadOne(activeId), 0);
    return () => clearTimeout(timer);
  }, [missingActive, activeId, loadOne]);

  const shown = limit ? items.slice(0, limit) : items;

  if (shown.length === 0) {
    return (
      <p
        className={cn(
          "px-5 py-10 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {role === "doctor"
          ? "No conversations yet. Message a patient from their chart."
          : "No conversations yet. Message a doctor from your appointments."}
      </p>
    );
  }

  return (
    <ul className={cn("divide-y", className)} aria-label="Conversations">
      {shown.map((conversation) => (
        <li key={conversation.id}>
          <ConversationListItem
            conversation={conversation}
            href={messagesRoutes[role].conversation(conversation.id)}
            active={conversation.id === activeId}
            compact={compact}
          />
        </li>
      ))}
    </ul>
  );
}
