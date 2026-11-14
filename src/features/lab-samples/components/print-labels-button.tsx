"use client";

import { Loader2Icon, TagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { prepareSampleLabels } from "@/features/lab-samples/actions/prepare-sample-labels";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

// Makes the booking's sample codes if it has none, then opens its labels.
export function PrintLabelsButton({ bookingId }: { bookingId: string }) {
  const { pending, onSubmit } = useFormAction(
    prepareSampleLabels,
    initialFormState,
  );

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="bookingId" value={bookingId} />
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
          <TagIcon aria-hidden />
        )}
        Print labels
      </Button>
    </form>
  );
}
