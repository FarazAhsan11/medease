"use client";

import { Button } from "@/components/ui/button";
import { removeTimeOff } from "@/features/doctor-dashboard/actions/time-off";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function TimeOffRemoveButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const { pending, onSubmit } = useFormAction(removeTimeOff, initialFormState);

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Remove ${label}`}
      >
        {pending ? "Removing…" : "Remove"}
      </Button>
    </form>
  );
}
