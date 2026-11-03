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
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

import { withdrawTelemedicineConsent } from "../actions/consents";

export function WithdrawConsentDialog() {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    withdrawTelemedicineConsent,
    initialFormState,
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" className="w-fit text-destructive">
            Withdraw consent
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw your consent?</AlertDialogTitle>
          <AlertDialogDescription>
            You won&apos;t be able to book consultations until you give it
            again. Your records and past care stay as they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form method="post" onSubmit={onSubmit}>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="gap-2"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Withdrawing…" : "Withdraw"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
