import Link from "next/link";

import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { MessageThread } from "@/features/doctor-dashboard/data/dashboard";

type RecentMessagesCardProps = {
  threads: MessageThread[];
};

export function RecentMessagesCard({ threads }: RecentMessagesCardProps) {
  return (
    <PanelCard
      title="Recent messages"
      action={<PanelLink href="/doctor/messages">Open inbox</PanelLink>}
    >
      <ul className="divide-y">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link
              href="/doctor/messages"
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/60"
            >
              <UserAvatar name={thread.patientName} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {thread.patientName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {thread.preview}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {thread.time}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
