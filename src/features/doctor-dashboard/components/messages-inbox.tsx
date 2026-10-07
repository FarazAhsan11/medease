"use client";

import { useState } from "react";

import { ConversationView } from "@/features/doctor-dashboard/components/conversation-view";
import { ThreadListItem } from "@/features/doctor-dashboard/components/thread-list-item";
import type { MessageThread } from "@/features/doctor-dashboard/data/dashboard";

type MessagesInboxProps = {
  threads: MessageThread[];
};

export function MessagesInbox({ threads }: MessagesInboxProps) {
  const [selectedId, setSelectedId] = useState(threads[0]?.id);
  const selected = threads.find((thread) => thread.id === selectedId);

  return (
    <div className="grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-[320px_1fr]">
      <ul className="divide-y border-b lg:border-r lg:border-b-0">
        {threads.map((thread) => (
          <li key={thread.id}>
            <ThreadListItem
              thread={thread}
              active={thread.id === selectedId}
              onSelect={() => setSelectedId(thread.id)}
            />
          </li>
        ))}
      </ul>
      {selected && <ConversationView thread={selected} />}
    </div>
  );
}
