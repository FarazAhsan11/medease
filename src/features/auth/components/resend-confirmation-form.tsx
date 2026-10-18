"use client";

import { Loader2Icon, RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resendConfirmation } from "@/features/auth/actions/resend-confirmation";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type ResendConfirmationFormProps = {
  email: string;
};

export function ResendConfirmationForm({ email }: ResendConfirmationFormProps) {
  const { pending, onSubmit } = useFormAction(
    resendConfirmation,
    initialFormState,
  );

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="email" value={email} />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-9 w-full gap-2"
      >
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <RotateCwIcon aria-hidden />
        )}
        {pending ? "Sending…" : "Resend confirmation email"}
      </Button>
    </form>
  );
}
