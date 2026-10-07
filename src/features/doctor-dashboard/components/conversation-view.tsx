import { PaperclipIcon, SendIcon, VideoIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MessageThread } from "@/features/doctor-dashboard/data/dashboard";
import { cn } from "@/lib/utils";

type ConversationViewProps = {
  thread: MessageThread;
};

export function ConversationView({ thread }: ConversationViewProps) {
  return (
    <section className="flex min-h-[520px] flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={thread.patientName} className="size-9" />
          <div>
            <h2 className="text-sm font-semibold">{thread.patientName}</h2>
            <p className="text-xs text-muted-foreground">Patient</p>
          </div>
        </div>
        <Link
          href="/video-call"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1.5",
          })}
        >
          <VideoIcon aria-hidden />
          Start call
        </Link>
      </header>

      <ol aria-live="polite" className="flex flex-1 flex-col gap-4 p-5">
        {thread.messages.map((message) => {
          const mine = message.from === "doctor";

          return (
            <li
              key={message.id}
              className={cn(
                "flex max-w-[80%] flex-col gap-1",
                mine && "items-end self-end",
              )}
            >
              <p
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted",
                )}
              >
                {message.text}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {message.time}
              </span>
            </li>
          );
        })}
      </ol>

      <form className="flex items-end gap-2 border-t p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach file"
        >
          <PaperclipIcon />
        </Button>
        <Textarea
          rows={1}
          aria-label="Reply"
          placeholder={`Reply to ${thread.patientName}…`}
          className="min-h-9 resize-none"
        />
        <Button type="button" size="icon" aria-label="Send reply">
          <SendIcon />
        </Button>
      </form>
    </section>
  );
}
