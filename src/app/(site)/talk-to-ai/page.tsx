import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { ChatPanel } from "@/features/chat/components/chat-panel";

export const metadata: Metadata = {
  title: "Talk to AI",
};

export default function TalkToAiPage() {
  return (
    <Container className="max-w-4xl py-6">
      <ChatPanel className="h-[calc(100dvh-7rem)]" />
    </Container>
  );
}
