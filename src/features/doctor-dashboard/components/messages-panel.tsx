import { UserAvatar } from "@/components/shared/user-avatar";
import { PanelCard } from "@/features/doctor-dashboard/components/panel-card";
import type { PatientMessage } from "@/features/doctor-dashboard/data/dashboard";
import { cn } from "@/lib/utils";

type MessagesPanelProps = {
  messages: PatientMessage[];
};

export function MessagesPanel({ messages }: MessagesPanelProps) {
  const unread = messages.filter((message) => message.unread).length;

  return (
    <PanelCard title="Inbox" description={`${unread} unread`}>
      <ul className="divide-y">
        {messages.map((message) => (
          <li key={message.id}>
            <button
              type="button"
              className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/60"
            >
              <UserAvatar name={message.sender} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "text-sm",
                      message.unread ? "font-semibold" : "font-medium",
                    )}
                  >
                    {message.sender}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.time}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {message.message}
                </span>
              </span>
              {message.unread && (
                <span
                  className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                  aria-label="Unread"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
