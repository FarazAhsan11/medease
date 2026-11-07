import type { Metadata } from "next";

import { MessagesInbox } from "@/features/messaging/components/messages-inbox";
import { listConversations } from "@/features/messaging/data/messaging";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function DoctorMessagesLayout({
  children,
}: LayoutProps<"/doctor/messages">) {
  const user = await requireRole("doctor");
  const conversations = await listConversations("doctor");

  return (
    <MessagesInbox
      userId={user.id}
      role="doctor"
      conversations={conversations}
      description="Questions and follow-ups from your patients."
    >
      {children}
    </MessagesInbox>
  );
}
