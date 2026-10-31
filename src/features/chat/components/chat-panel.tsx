import { PreviewNotice } from "@/components/shared/preview-notice";
import { SignInPrompt } from "@/components/shared/sign-in-prompt";
import { patientRoutes } from "@/config/routes";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
  // Guests see the assistant but must log in before chatting.
  locked?: boolean;
  className?: string;
};

export function ChatPanel({ locked = false, className }: ChatPanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-[520px] flex-col overflow-hidden rounded-2xl border bg-card shadow-soft",
        className,
      )}
    >
      <ChatHeader />
      <div className="p-3 pb-0">
        <PreviewNotice feature="The AI assistant" />
      </div>
      <div aria-live="polite" className="flex flex-1 flex-col overflow-y-auto">
        <ChatEmptyState />
      </div>
      {locked ? (
        <div className="border-t p-4">
          <SignInPrompt
            title="Log in to start chatting"
            description="Your conversation stays private to your account."
            href={patientRoutes.talkToAi}
            className="bg-background"
          />
        </div>
      ) : (
        <ChatComposer />
      )}
    </div>
  );
}
