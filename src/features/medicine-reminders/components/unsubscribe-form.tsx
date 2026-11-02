"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

import { unsubscribeFromMedicineReminders } from "../actions/unsubscribe";

// Turning reminders off takes a click, not just opening the link, because email
// scanners open every link they find.
export function UnsubscribeForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useFormAction(
    unsubscribeFromMedicineReminders,
    initialFormState,
  );

  if (state.status === "success") {
    return (
      <p className="text-sm" role="status">
        Medicine reminders are off. You can turn them back on any time in your
        settings.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted-foreground">
        You&apos;ll stop getting emails at your dose times. Your medicines stay
        in your account.
      </p>
      <Button type="submit" disabled={pending} className="w-fit gap-2">
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Turning off…" : "Turn off reminders"}
      </Button>
    </form>
  );
}
