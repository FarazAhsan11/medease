"use client";

import { Loader2Icon, SignatureIcon } from "lucide-react";
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
import { signOffLabReport } from "@/features/lab-reports/actions/sign-off-lab-report";
import { signerLine, type LabSigner } from "@/features/lab-staff/lib/lab-staff";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type SignOffReportDialogProps = {
  reportId: string;
  // "Ali Raza · CBC, HbA1c"
  summary: string;
  signer: LabSigner;
};

// Releasing a report to the patient (LAB-17): the signer confirms they've
// reviewed it and sees what will be stamped on it.
export function SignOffReportDialog({
  reportId,
  summary,
  signer,
}: SignOffReportDialogProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    signOffLabReport,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <SignatureIcon aria-hidden />
        Sign off
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="reportId" value={reportId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Sign off this report?</AlertDialogTitle>
            <AlertDialogDescription>
              {summary}. Sign off only once you&apos;ve opened and reviewed it.
              The patient is told and can open it straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg bg-muted px-3 py-2 text-xs">
            <p className="font-medium">Stamped under every page</p>
            <p className="mt-1 break-words text-muted-foreground">
              Reviewed and signed off by {signerLine(signer)}, with the date and
              time.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Signing off…" : "Sign off and release"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
