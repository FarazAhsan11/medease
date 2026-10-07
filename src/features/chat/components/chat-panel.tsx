import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
  className?: string;
};

export function ChatPanel({ className }: ChatPanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-[520px] flex-col overflow-hidden rounded-2xl border bg-card shadow-soft",
        className,
      )}
    >
      <ChatHeader />
      <div aria-live="polite" className="flex flex-1 flex-col overflow-y-auto">
        <ChatEmptyState />
      </div>
      <ChatComposer />
    </div>
  );
}
