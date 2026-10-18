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
import { cancelAppointment } from "@/features/appointments/actions/cancel-appointment";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type CancelAppointmentDialogProps = {
  appointmentId: string;
  // "Dr. Ayesha Siddiqui on Mon, Oct 19 · 10:30 AM"
  summary: string;
  // Who will be told: shapes the hint under the reason field.
  notify: "doctor" | "patient";
  triggerLabel?: string;
};

export function CancelAppointmentDialog({
  appointmentId,
  summary,
  notify,
  triggerLabel = "Cancel",
}: CancelAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    cancelAppointment,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );

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
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {summary}. The time slot will open up for other patients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor={`cancel-reason-${appointmentId}`}>
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={`cancel-reason-${appointmentId}`}
              name="reason"
              rows={3}
              maxLength={500}
              placeholder={
                notify === "patient"
                  ? "e.g. I'm unavailable at this time; please rebook for later this week."
                  : "e.g. I'm feeling better"
              }
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll email the {notify} to let them know.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Keep appointment
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="gap-2"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Cancelling…" : "Cancel appointment"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
