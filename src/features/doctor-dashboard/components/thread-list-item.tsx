import { UserAvatar } from "@/components/shared/user-avatar";
import type { MessageThread } from "@/features/doctor-dashboard/data/dashboard";
import { cn } from "@/lib/utils";

type ThreadListItemProps = {
  thread: MessageThread;
  active?: boolean;
  onSelect?: () => void;
};

export function ThreadListItem({
  thread,
  active = false,
  onSelect,
}: ThreadListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors",
        active ? "bg-secondary/60" : "hover:bg-muted/60",
      )}
    >
      <UserAvatar name={thread.patientName} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-sm",
              thread.unread ? "font-semibold" : "font-medium",
            )}
          >
            {thread.patientName}
          </span>
          <span className="text-xs text-muted-foreground">{thread.time}</span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
          {thread.preview}
        </span>
      </span>
      {thread.unread && (
        <span
          className="mt-2 size-2 shrink-0 rounded-full bg-primary"
          aria-label="Unread"
        />
      )}
    </button>
  );
}
