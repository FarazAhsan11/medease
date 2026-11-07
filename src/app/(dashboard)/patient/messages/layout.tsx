import type { Metadata } from "next";

import { MessagesInbox } from "@/features/messaging/components/messages-inbox";
import { listConversations } from "@/features/messaging/data/messaging";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function PatientMessagesLayout({
  children,
}: LayoutProps<"/patient/messages">) {
  const user = await requireRole("patient");
  const conversations = await listConversations("patient");

  return (
    <MessagesInbox
      userId={user.id}
      role="patient"
      conversations={conversations}
      description="Questions for the doctors you've booked. Not for emergencies."
    >
      {children}
    </MessagesInbox>
  );
}
