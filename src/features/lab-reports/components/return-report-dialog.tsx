"use client";

import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";

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
import { returnLabReport } from "@/features/lab-reports/actions/return-lab-report";
import { MAX_RETURN_NOTE } from "@/features/lab-reports/lib/lab-reports";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type ReturnReportDialogProps = {
  reportId: string;
  // "Ali Raza · CBC, HbA1c"
  summary: string;
};

// A signer sends a report back for a fix (LAB-17). The note stays in the lab.
export function ReturnReportDialog(props: ReturnReportDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Send back
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* Mounted per opening, so each one starts with an empty note. */}
        <ReturnReportForm {...props} onDone={() => setOpen(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReturnReportForm({
  reportId,
  summary,
  onDone,
}: ReturnReportDialogProps & { onDone: () => void }) {
  const id = useId();
  const { pending, onSubmit, fieldError } = useFormAction(
    returnLabReport,
    initialFormState,
    { onSuccess: onDone },
  );
  const noteError = fieldError("note");

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="reportId" value={reportId} />
      <AlertDialogHeader>
        <AlertDialogTitle>Send the report back?</AlertDialogTitle>
        <AlertDialogDescription>
          {summary}. Whoever uploaded it is told, and the booking waits for a
          new upload. The patient sees nothing.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <FormField id={id} label="What needs changing" error={noteError}>
        <Textarea
          id={id}
          name="note"
          rows={3}
          maxLength={MAX_RETURN_NOTE}
          placeholder="e.g. Haemoglobin is in the wrong unit on page 1."
          {...fieldErrorProps(id, noteError)}
        />
      </FormField>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          Send back
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
