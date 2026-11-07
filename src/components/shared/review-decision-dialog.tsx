"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState, type FormState } from "@/lib/form-state";
import type { ReviewDecision, ReviewDecisionCopy } from "@/lib/verification";

type ReviewDecisionDialogProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  // The hidden field naming who is reviewed, e.g. { doctorId: "…" }.
  target: Record<string, string>;
  decision: ReviewDecision;
  copy: ReviewDecisionCopy;
  disabled?: boolean;
};

// An admin's verification decision, for doctors and labs alike.
export function ReviewDecisionDialog({
  action,
  target,
  decision,
  copy,
  disabled = false,
}: ReviewDecisionDialogProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    action,
    initialFormState,
  );
  const noteId = `review-note-${decision}`;
  const noteError = fieldError("note");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant={
              decision === "approved"
                ? "default"
                : decision === "rejected"
                  ? "destructive"
                  : "outline"
            }
            disabled={disabled}
          />
        }
      >
        {copy.trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form
          method="post"
          onSubmit={onSubmit}
          className="grid gap-4"
          noValidate
        >
          {Object.entries(target).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input type="hidden" name="decision" value={decision} />
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {copy.noteLabel && (
            <FormField id={noteId} label={copy.noteLabel} error={noteError}>
              <Textarea
                id={noteId}
                name="note"
                rows={3}
                maxLength={500}
                required
                {...fieldErrorProps(noteId, noteError)}
              />
            </FormField>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Go back</AlertDialogCancel>
            <Button
              type="submit"
              variant={decision === "rejected" ? "destructive" : "default"}
              disabled={pending}
              className="gap-2"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? copy.pending : copy.confirm}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
