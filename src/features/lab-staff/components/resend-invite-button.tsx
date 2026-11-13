"use client";

import { Loader2Icon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resendLabInvite } from "@/features/lab-staff/actions/resend-lab-invite";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type ResendInviteButtonProps = {
  userId: string;
};

export function ResendInviteButton({ userId }: ResendInviteButtonProps) {
  const { pending, onSubmit } = useFormAction(
    resendLabInvite,
    initialFormState,
  );

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        className="gap-1.5"
      >
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <SendIcon aria-hidden />
        )}
        Send again
      </Button>
    </form>
  );
}
