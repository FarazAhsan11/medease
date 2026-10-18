"use client";

import { Loader2Icon, LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAppointmentNotes } from "@/features/appointments/actions/save-appointment-notes";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type AppointmentNotesFormProps = {
  appointmentId: string;
  notes: string;
};

export function AppointmentNotesForm({
  appointmentId,
  notes,
}: AppointmentNotesFormProps) {
  const { pending, onSubmit, fieldError } = useFormAction(
    saveAppointmentNotes,
    initialFormState,
  );
  const id = `notes-${appointmentId}`;

  return (
    <form onSubmit={onSubmit} className="grid gap-1.5">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <Label htmlFor={id}>Consultation notes</Label>
      <Textarea
        // Remount with fresh notes after a save or refresh.
        key={notes}
        id={id}
        name="notes"
        rows={4}
        maxLength={5000}
        defaultValue={notes}
        placeholder="Symptoms, findings, advice…"
        aria-invalid={Boolean(fieldError("notes"))}
      />
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <LockIcon className="size-3" aria-hidden />
        Only you can see these notes.
      </p>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        className="mt-1 w-fit gap-1.5"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save notes"}
      </Button>
    </form>
  );
}
