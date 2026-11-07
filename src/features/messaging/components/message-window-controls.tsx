"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setMessageWindow } from "@/features/messaging/actions/set-message-window";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type MessageWindowControlsProps = {
  conversationId: string;
  open: boolean;
};

// MSG-04: the doctor decides how long the patient can keep writing.
export function MessageWindowControls({
  conversationId,
  open,
}: MessageWindowControlsProps) {
  const { pending, onSubmit } = useFormAction(
    setMessageWindow,
    initialFormState,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {(["extend", "close"] as const)
        .filter((action) => action === "extend" || open)
        .map((action) => (
          <form key={action} method="post" onSubmit={onSubmit}>
            <input type="hidden" name="conversationId" value={conversationId} />
            <input type="hidden" name="action" value={action} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending}
              className="gap-1.5"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {action === "extend" ? "Allow 7 more days" : "Close now"}
            </Button>
          </form>
        ))}
    </div>
  );
}
