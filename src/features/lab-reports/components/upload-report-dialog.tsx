"use client";

import { Loader2Icon, UploadIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  MAX_REPORT_MB,
  REPORT_ACCEPT,
} from "@/features/lab-reports/lib/lab-reports";
import { uploadLabReport } from "@/features/lab-reports/lib/upload-lab-report";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type UploadReportDialogProps = {
  bookingId: string;
  // "Ali Raza · CBC, HbA1c"
  summary: string;
};

// Publishing the report is the booking's last step: the patient is told
// straight away, so the lab confirms whose report it is first.
export function UploadReportDialog(props: UploadReportDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UploadIcon aria-hidden />
        Upload report
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* Mounted per opening, so each one starts with no file chosen. */}
        <UploadReportForm {...props} onDone={() => setOpen(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UploadReportForm({
  bookingId,
  summary,
  onDone,
}: UploadReportDialogProps & { onDone: () => void }) {
  const id = useId();
  const { pending, onSubmit, fieldError } = useFormAction(
    uploadLabReport,
    initialFormState,
    { onSuccess: onDone },
  );
  const fileError = fieldError("file");

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <AlertDialogHeader>
        <AlertDialogTitle>Publish the report?</AlertDialogTitle>
        <AlertDialogDescription>
          {summary}. Check it&apos;s this person&apos;s report: they&apos;re
          told it&apos;s ready and can open it in MedEase straight away.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <FormField
        id={id}
        label="Report"
        hint={`PDF, up to ${MAX_REPORT_MB} MB`}
        error={fileError}
      >
        <Input
          id={id}
          name="file"
          type="file"
          accept={REPORT_ACCEPT}
          {...fieldErrorProps(id, fileError)}
        />
      </FormField>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Publishing…" : "Publish report"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
