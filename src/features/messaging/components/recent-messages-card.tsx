import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import {
  messagesRoutes,
  type Conversation,
  type MessagingRole,
} from "@/features/messaging/lib/messaging";

type RecentMessagesCardProps = {
  userId: string;
  role: MessagingRole;
  conversations: Conversation[];
};

export const RECENT_MESSAGES_SHOWN = 4;

export function RecentMessagesCard({
  userId,
  role,
  conversations,
}: RecentMessagesCardProps) {
  return (
    <PanelCard
      title="Recent messages"
      action={
        <PanelLink href={messagesRoutes[role].inbox}>Open inbox</PanelLink>
      }
    >
      <ConversationList
        userId={userId}
        role={role}
        conversations={conversations}
        compact
        limit={RECENT_MESSAGES_SHOWN}
      />
    </PanelCard>
  );
}
