import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { MessagesInbox } from "@/features/doctor-dashboard/components/messages-inbox";
import { messageThreads } from "@/features/doctor-dashboard/data/dashboard";

export const metadata: Metadata = {
  title: "Messages",
};

export default function DoctorMessagesPage() {
  return (
    <>
      <DashboardPageHeader
        title="Messages"
        description="Questions and follow-ups from your patients."
      />
      <MessagesInbox threads={messageThreads} />
    </>
  );
}
