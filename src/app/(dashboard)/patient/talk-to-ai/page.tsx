import type { Metadata } from "next";

import { ChatPanel } from "@/features/chat/components/chat-panel";

export const metadata: Metadata = {
  title: "Talk to AI",
};

export default function PatientTalkToAiPage() {
  return <ChatPanel className="mx-auto h-[calc(100dvh-8rem)] max-w-4xl" />;
}
