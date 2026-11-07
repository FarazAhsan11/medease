"use client";

import { Loader2Icon, MessageSquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openConversation } from "@/features/messaging/actions/open-conversation";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type MessageButtonProps = {
  // The doctor, for a patient; the patient, for a doctor.
  otherId: string;
  label?: string;
};

// Opens the conversation, starting it the first time. The database checks the
// two have a booking together.
export function MessageButton({
  otherId,
  label = "Message",
}: MessageButtonProps) {
  const { pending, onSubmit } = useFormAction(
    openConversation,
    initialFormState,
  );

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="otherId" value={otherId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        className="gap-1.5"
      >
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <MessageSquareIcon aria-hidden />
        )}
        {label}
      </Button>
    </form>
  );
}
