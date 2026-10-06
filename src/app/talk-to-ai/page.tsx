import type { Metadata } from "next";

import { ChatWindow } from "@/features/chat/components/chat-window";

export const metadata: Metadata = {
  title: "Talk to AI",
};

export default function TalkToAiPage() {
  return <ChatWindow />;
}
