import { notFound } from "next/navigation";
import { z } from "zod";

import { ConversationView } from "@/features/messaging/components/conversation-view";
import {
  getConversation,
  getMessages,
} from "@/features/messaging/data/messaging";
import { requireRole } from "@/lib/auth/session";

export default async function PatientConversationPage({
  params,
}: PageProps<"/patient/messages/[conversationId]">) {
  const user = await requireRole("patient");
  const { conversationId } = await params;
  if (!z.uuid().safeParse(conversationId).success) notFound();

  const [conversation, messages] = await Promise.all([
    getConversation("patient", conversationId),
    getMessages(conversationId),
  ]);
  if (!conversation) notFound();

  return (
    <ConversationView
      conversation={conversation}
      messages={messages}
      role="patient"
      userId={user.id}
    />
  );
}
