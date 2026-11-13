"use client";

import { Loader2Icon, UserMinusIcon } from "lucide-react";
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
import { removeLabStaff } from "@/features/lab-staff/actions/remove-lab-staff";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type RemoveStaffDialogProps = {
  userId: string;
  name: string;
  // An unused invitation is withdrawn rather than a person removed.
  invited: boolean;
};

export function RemoveStaffDialog({
  userId,
  name,
  invited,
}: RemoveStaffDialogProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    removeLabStaff,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );
  const label = invited ? "Withdraw" : "Remove";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={invited ? `Withdraw ${name}'s invitation` : `Remove ${name}`}
          />
        }
      >
        <UserMinusIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="userId" value={userId} />
          <AlertDialogHeader>
            <AlertDialogTitle>
              {invited
                ? `Withdraw ${name}'s invitation?`
                : `Remove ${name} from your lab?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {invited
                ? "The link in their email stops working. You can invite them again later."
                : "They lose access straight away and can't sign in again. What they did stays on your bookings' history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="gap-2"
            >
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? (invited ? "Withdrawing…" : "Removing…") : label}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
