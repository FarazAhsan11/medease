"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_MAX_LENGTH } from "@/features/messaging/lib/messaging";
import { cn } from "@/lib/utils";

type MessageComposerProps = {
  placeholder: string;
  // Resolves true when the message was sent, so the text can be cleared.
  onSend: (body: string) => Promise<boolean>;
};

const COUNTER_FROM = MESSAGE_MAX_LENGTH - 200;

export function MessageComposer({ placeholder, onSend }: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const trimmed = body.trim();
  const tooLong = trimmed.length > MESSAGE_MAX_LENGTH;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (sending || !trimmed || tooLong) return;

    setSending(true);
    const sent = await onSend(trimmed);
    setSending(false);
    if (sent) setBody("");
  }

  // Enter sends, Shift+Enter starts a new line.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 border-t bg-card p-3"
      noValidate
    >
      <div className="grid flex-1 gap-1">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="Message"
          aria-invalid={tooLong || undefined}
          placeholder={placeholder}
          className="max-h-40 min-h-10 resize-none rounded-xl bg-background"
        />
        {trimmed.length > COUNTER_FROM && (
          <span
            className={cn(
              "text-xs",
              tooLong ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {trimmed.length} / {MESSAGE_MAX_LENGTH}
          </span>
        )}
      </div>
      <Button
        type="submit"
        size="icon"
        aria-label="Send message"
        className="size-10 shrink-0 rounded-xl"
        disabled={sending || !trimmed || tooLong}
      >
        {sending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <SendIcon aria-hidden />
        )}
      </Button>
    </form>
  );
}
