import type { Message } from "@/features/messaging/lib/messaging";
import { CLINIC_TIMEZONE, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: Message;
  mine: boolean;
  // The first of a run from the same person gets space above it.
  startsGroup: boolean;
  // The last of a run shows the time, and the caller's latest shows whether
  // the other person has read it.
  showTime: boolean;
  receipt?: boolean;
};

export function MessageBubble({
  message,
  mine,
  startsGroup,
  showTime,
  receipt,
}: MessageBubbleProps) {
  return (
    <li
      className={cn(
        "flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]",
        mine ? "items-end self-end" : "items-start self-start",
        startsGroup ? "mt-3 first:mt-0" : "mt-0.5",
      )}
    >
      <p
        className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs",
          mine
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-card-foreground",
          mine && showTime && "rounded-br-md",
          !mine && showTime && "rounded-bl-md",
        )}
      >
        <span className="sr-only">{mine ? "You: " : "Them: "}</span>
        {message.body}
      </p>
      {(showTime || receipt) && (
        <span className="px-1 text-[11px] text-muted-foreground">
          {formatTime(message.createdAt, CLINIC_TIMEZONE)}
          {receipt && (message.readAt ? " · Seen" : " · Sent")}
        </span>
      )}
    </li>
  );
}
