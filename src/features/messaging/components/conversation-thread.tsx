"use client";

import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { markConversationRead } from "@/features/messaging/actions/mark-conversation-read";
import { sendMessage } from "@/features/messaging/actions/send-message";
import { MessageBubble } from "@/features/messaging/components/message-bubble";
import { MessageComposer } from "@/features/messaging/components/message-composer";
import { useUserChannel } from "@/features/messaging/hooks/use-user-channel";
import {
  mergeMessages,
  sameRun,
  toMessage,
  type Message,
} from "@/features/messaging/lib/messaging";
import { queryMessages } from "@/features/messaging/lib/queries";
import { NETWORK_ERROR_MESSAGE } from "@/lib/errors";
import { CLINIC_TIMEZONE, formatDate, toDateKey } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/client";

type ConversationThreadProps = {
  conversationId: string;
  userId: string;
  messages: Message[];
  canWrite: boolean;
  placeholder: string;
  // Shown instead of the composer when the caller can't write.
  closedNotice?: ReactNode;
};

// Codes after which the page is out of date (the window closed, a booking was
// cancelled), so it reloads to show why.
const STALE_CODES = new Set(["window_closed", "no_appointment"]);

export function ConversationThread({
  conversationId,
  userId,
  messages: initialMessages,
  canWrite,
  placeholder,
  closedNotice,
}: ConversationThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const hasUnread = useRef(false);
  useEffect(() => {
    hasUnread.current = messages.some(
      (message) => message.senderId !== userId && message.readAt === null,
    );
  }, [messages, userId]);

  // Messages are read while the conversation is on screen: when it opens, when
  // one arrives, and when the tab comes back into view. The receipt comes back
  // on the live channel, to the header badge, the list and the sender.
  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    void markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (hasUnread.current) markRead();
    function onVisible() {
      if (hasUnread.current) markRead();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  // Messages newer than the newest shown, or the latest page when `after` is
  // missing.
  const fetchMessages = useCallback(
    async (after?: string) => {
      const rows = await queryMessages(createClient(), conversationId, after);
      if (!rows?.length) return;
      setMessages((current) => mergeMessages(current, rows.map(toMessage)));
      if (rows.some((row) => row.recipient_id === userId && !row.read_at)) {
        markRead();
      }
    },
    [conversationId, markRead, userId],
  );

  useUserChannel(userId, {
    onMessage: (row) => {
      if (row.conversation_id !== conversationId) return;
      setMessages((current) => mergeMessages(current, [toMessage(row)]));
      if (row.recipient_id === userId && row.read_at === null) markRead();
    },
    // The other person reading shows "Seen" on the caller's messages; the
    // caller reading (here or in another tab) marks theirs, so nothing asks
    // the database to read them again.
    onRead: (receipt) => {
      if (receipt.conversation_id !== conversationId) return;
      const otherReader = receipt.reader_id !== userId;
      setMessages((current) =>
        current.map((message) =>
          (message.senderId === userId) === otherReader &&
          message.readAt === null &&
          message.createdAt <= receipt.read_at
            ? { ...message, readAt: receipt.read_at }
            : message,
        ),
      );
    },
    // On joining, only what arrived since the page was rendered; after a
    // dropped connection, the latest page again, which also refreshes receipts.
    onLive: (when) => {
      void fetchMessages(
        when === "first" ? messages.at(-1)?.createdAt : undefined,
      );
    },
  });

  // Follow new messages while the reader is at the bottom; leave them alone
  // when they've scrolled up to read something older.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const element = scroller.current;
    if (!element) return;
    stickToBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }

  async function send(body: string) {
    try {
      const result = await sendMessage({ conversationId, body });
      if (result.status === "success" && result.sent) {
        stickToBottom.current = true;
        setMessages((current) => mergeMessages(current, [result.sent!]));
        return true;
      }
      toast.error(result.message);
      if (result.code && STALE_CODES.has(result.code)) router.refresh();
      return false;
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
      return false;
    }
  }

  const lastMine = messages.findLast((message) => message.senderId === userId);

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/30"
      >
        {messages.length === 0 ? (
          <p className="m-auto max-w-xs px-5 py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello, or ask your question.
          </p>
        ) : (
          <ol
            aria-label="Messages"
            aria-live="polite"
            aria-relevant="additions"
            // Short conversations sit at the bottom, by the box to write in.
            className="mt-auto flex flex-col px-3 py-4 sm:px-6"
          >
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const newDay =
                !previous ||
                toDateKey(previous.createdAt, CLINIC_TIMEZONE) !==
                  toDateKey(message.createdAt, CLINIC_TIMEZONE);

              return (
                <Fragment key={message.id}>
                  {newDay && (
                    <li className="my-3 self-center rounded-full border bg-card px-3 py-0.5 text-[11px] font-medium text-muted-foreground first:mt-0">
                      {formatDate(message.createdAt, CLINIC_TIMEZONE)}
                    </li>
                  )}
                  <MessageBubble
                    message={message}
                    mine={message.senderId === userId}
                    startsGroup={newDay || !sameRun(previous, message)}
                    showTime={!sameRun(message, next)}
                    receipt={message.id === lastMine?.id}
                  />
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>
      {canWrite ? (
        <MessageComposer placeholder={placeholder} onSend={send} />
      ) : (
        closedNotice
      )}
    </>
  );
}
