import { ChatInput } from "@/features/chat/components/chat-input";

export function ChatWindow() {
  return (
    <div className="flex h-screen w-full items-start justify-center overflow-x-hidden bg-surface-chat p-2.5">
      <div className="h-full w-full max-w-[80%] overflow-x-hidden rounded-[32px] bg-surface-chat-panel max-md:h-auto max-md:max-w-[95%]">
        <div className="flex h-[88%] w-full justify-center overflow-x-hidden">
          <div
            aria-live="polite"
            className="m-6 max-h-full w-full [scrollbar-width:none] overflow-x-hidden overflow-y-auto rounded-[28px] border border-line-chat bg-surface-chat-panel p-2.5 max-md:h-[700px] max-md:max-w-[95%]"
          />
        </div>
        <ChatInput />
      </div>
    </div>
  );
}
