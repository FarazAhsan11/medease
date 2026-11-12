"use client";

import { Loader2Icon } from "lucide-react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewLabResult } from "@/features/lab-orders/actions/review-lab-result";
import { MAX_RESULT_COMMENT } from "@/features/lab-orders/lib/lab-orders";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type LabResultReviewFormProps = {
  bookingId: string;
  comment: string | null;
  reviewed: boolean;
};

// The ordering doctor marks a report reviewed, with an optional comment the
// patient sees beside it.
export function LabResultReviewForm({
  bookingId,
  comment,
  reviewed,
}: LabResultReviewFormProps) {
  const { pending, onSubmit, fieldError } = useFormAction(
    reviewLabResult,
    initialFormState,
  );
  const id = `lab-result-comment-${bookingId}`;

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-3" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      {/* Only words the success message when a comment is cleared. */}
      <input type="hidden" name="hadComment" value={comment ? "1" : ""} />
      <FormField
        id={id}
        label="Comment for the patient (optional)"
        hint="Shown with the report. Leave it blank to mark the report reviewed without one."
        error={fieldError("comment")}
      >
        <Textarea
          id={id}
          name="comment"
          rows={3}
          maxLength={MAX_RESULT_COMMENT}
          defaultValue={comment ?? ""}
          {...fieldErrorProps(id, fieldError("comment"))}
        />
      </FormField>
      <Button
        type="submit"
        size="sm"
        variant={reviewed ? "outline" : "default"}
        disabled={pending}
        className="w-fit gap-1.5"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : reviewed ? "Save comment" : "Mark reviewed"}
      </Button>
    </form>
  );
}
