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
import { reviewDoctor } from "@/features/doctor-verification/actions/review-doctor";
import type { ReviewDecision } from "@/features/doctor-verification/lib/verification";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

const copy: Record<
  ReviewDecision,
  {
    trigger: string;
    title: string;
    description: string;
    confirm: string;
    pending: string;
    noteLabel?: string;
  }
> = {
  approved: {
    trigger: "Approve",
    title: "Approve this doctor?",
    description:
      "Only approve after checking their license against the PMDC register. They'll appear in search, and patients can book them.",
    confirm: "Approve doctor",
    pending: "Approving…",
  },
  needs_info: {
    trigger: "Ask for more information",
    title: "Ask for more information?",
    description:
      "They stay hidden from patients and go back into this queue when they send new documents.",
    confirm: "Send request",
    pending: "Sending…",
    noteLabel: "What do you need from them?",
  },
  rejected: {
    trigger: "Reject",
    title: "Reject this doctor?",
    description: "This is final. They stay hidden from patients.",
    confirm: "Reject doctor",
    pending: "Rejecting…",
    noteLabel: "Reason, shown to the doctor",
  },
};

type ReviewDecisionDialogProps = {
  doctorId: string;
  decision: ReviewDecision;
  disabled?: boolean;
};

export function ReviewDecisionDialog({
  doctorId,
  decision,
  disabled = false,
}: ReviewDecisionDialogProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    reviewDoctor,
    initialFormState,
  );
  const text = copy[decision];
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
        {text.trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <input type="hidden" name="doctorId" value={doctorId} />
          <input type="hidden" name="decision" value={decision} />
          <AlertDialogHeader>
            <AlertDialogTitle>{text.title}</AlertDialogTitle>
            <AlertDialogDescription>{text.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {text.noteLabel && (
            <FormField id={noteId} label={text.noteLabel} error={noteError}>
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
              {pending ? text.pending : text.confirm}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
