"use client";

import { FilePenLineIcon, Loader2Icon, UploadIcon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_CORRECTION_REASON,
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
  // The uploader may sign off reports, so can do it in the same step.
  canSign: boolean;
  // Uploads a correction of the released report, with a reason (LAB-18).
  correcting?: boolean;
};

// The report waits for a pathologist's sign-off before the patient sees it
// (LAB-17); a pathologist uploading can sign it off at once. Either way the
// lab confirms whose report it is first. A correction (LAB-18) also says why,
// and replaces the released report only once it's signed off.
export function UploadReportDialog(props: UploadReportDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            variant={props.correcting ? "outline" : "default"}
            className="gap-1.5"
          />
        }
      >
        {props.correcting ? (
          <FilePenLineIcon aria-hidden />
        ) : (
          <UploadIcon aria-hidden />
        )}
        {props.correcting ? "Correct report" : "Upload report"}
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
  canSign,
  correcting = false,
  onDone,
}: UploadReportDialogProps & { onDone: () => void }) {
  const id = useId();
  const reasonId = useId();
  const { pending, onSubmit, fieldError } = useFormAction(
    uploadLabReport,
    initialFormState,
    { onSuccess: onDone },
  );
  const fileError = fieldError("file");
  const reasonError = fieldError("reason");

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <AlertDialogHeader>
        <AlertDialogTitle>
          {correcting ? "Upload a corrected report?" : "Upload the report?"}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {correcting ? (
            <>
              {summary}. Upload the whole report again with the correction. Once
              a pathologist signs it off it replaces the current one, the
              patient and their doctor are told, and the earlier version stays
              available to them.
            </>
          ) : (
            <>
              {summary}. Check it&apos;s this person&apos;s report. They&apos;re
              told it&apos;s ready once a pathologist signs it off.
            </>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {correcting && (
        <FormField
          id={reasonId}
          label="What was corrected"
          hint="Printed on the report, and shown to the patient and their doctor."
          error={reasonError}
        >
          <Textarea
            id={reasonId}
            name="reason"
            rows={2}
            maxLength={MAX_CORRECTION_REASON}
            placeholder="e.g. Potassium was reported in the wrong unit."
            {...fieldErrorProps(reasonId, reasonError)}
          />
        </FormField>
      )}
      <FormField
        id={id}
        label={correcting ? "Corrected report" : "Report"}
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
      {canSign && (
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <Checkbox name="signNow" value="1" className="mt-0.5" />
          <span>
            I&apos;ve reviewed it: sign it off now
            <span className="block text-xs text-muted-foreground">
              Your name and qualification are stamped on every page, and the
              patient can open it straight away.
            </span>
          </span>
        </label>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending
            ? "Uploading…"
            : correcting
              ? "Upload correction"
              : "Upload report"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
