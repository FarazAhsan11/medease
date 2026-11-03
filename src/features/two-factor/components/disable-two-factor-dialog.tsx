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
import { disableTwoFactor } from "@/features/two-factor/actions/two-factor";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function DisableTwoFactorDialog() {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    disableTwoFactor,
    initialFormState,
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" className="w-fit text-destructive">
            Turn off two-factor
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Turn off two-factor?</AlertDialogTitle>
          <AlertDialogDescription>
            Your password alone will open your account, and your recovery codes
            will stop working.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form method="post" onSubmit={onSubmit}>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep it on</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="gap-2"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Turning off…" : "Turn off"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
