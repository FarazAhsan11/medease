import { EmergencyNotice } from "@/components/shared/emergency-notice";
import { ConversationHeader } from "@/features/messaging/components/conversation-header";
import { ConversationThread } from "@/features/messaging/components/conversation-thread";
import { MessageWindowStatus } from "@/features/messaging/components/message-window-status";
import type {
  Conversation,
  Message,
  MessagingRole,
} from "@/features/messaging/lib/messaging";

type ConversationViewProps = {
  conversation: Conversation;
  messages: Message[];
  role: MessagingRole;
  userId: string;
};

export function ConversationView({
  conversation,
  messages,
  role,
  userId,
}: ConversationViewProps) {
  const status = (
    <MessageWindowStatus conversation={conversation} role={role} />
  );

  return (
    <section
      aria-label={`Conversation with ${conversation.otherName}`}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ConversationHeader conversation={conversation} role={role} />
      {conversation.canWrite && status}
      <ConversationThread
        // A new conversation starts with fresh state.
        key={conversation.id}
        conversationId={conversation.id}
        userId={userId}
        messages={messages}
        canWrite={conversation.canWrite}
        placeholder={`Message ${conversation.otherName}…`}
        closedNotice={status}
      />
      {role === "patient" && (
        <EmergencyNotice className="bg-card px-4 pb-2.5 text-muted-foreground" />
      )}
    </section>
  );
}
