import { notFound } from "next/navigation";
import { z } from "zod";

import { ConversationView } from "@/features/messaging/components/conversation-view";
import {
  getConversation,
  getMessages,
} from "@/features/messaging/data/messaging";
import { requireRole } from "@/lib/auth/session";

export default async function DoctorConversationPage({
  params,
}: PageProps<"/doctor/messages/[conversationId]">) {
  const user = await requireRole("doctor");
  const { conversationId } = await params;
  if (!z.uuid().safeParse(conversationId).success) notFound();

  const [conversation, messages] = await Promise.all([
    getConversation("doctor", conversationId),
    getMessages(conversationId),
  ]);
  if (!conversation) notFound();

  return (
    <ConversationView
      conversation={conversation}
      messages={messages}
      role="doctor"
      userId={user.id}
    />
  );
}
