"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelPrescription } from "@/features/prescriptions/actions/cancel-prescription";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type CancelPrescriptionDialogProps = {
  prescriptionId: string;
  patientName: string;
};

export function CancelPrescriptionDialog({
  prescriptionId,
  patientName,
}: CancelPrescriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    cancelPrescription,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );
  const id = `cancel-rx-${prescriptionId}`;
  const error = fieldError("reason");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        Cancel prescription
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="prescriptionId" value={prescriptionId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this prescription?</AlertDialogTitle>
            <AlertDialogDescription>
              {patientName} will be told to stop taking these medicines. This
              can&apos;t be undone; you can write a new prescription if the
              appointment is still open for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor={id}>Reason for the patient</Label>
            <Textarea
              id={id}
              name="reason"
              rows={3}
              required
              maxLength={500}
              placeholder="e.g. Wrong dose entered. I've issued a corrected prescription."
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-hint`}
            />
            <p
              id={`${id}-hint`}
              className={
                error
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {error ?? "We'll email the patient with this reason."}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Keep prescription
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="gap-2"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Cancelling…" : "Cancel prescription"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
