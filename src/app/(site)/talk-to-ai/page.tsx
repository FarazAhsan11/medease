import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatHeader } from "@/features/chat/components/chat-header";

export const metadata: Metadata = {
  title: "Talk to AI",
};

export default function TalkToAiPage() {
  return (
    <Container className="max-w-4xl py-6">
      <div className="flex h-[calc(100dvh-7rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border bg-card shadow-soft">
        <ChatHeader />
        <div
          aria-live="polite"
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <ChatEmptyState />
        </div>
        <ChatComposer />
      </div>
    </Container>
  );
}
