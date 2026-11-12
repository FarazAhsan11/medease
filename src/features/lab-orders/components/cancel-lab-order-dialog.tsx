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
import { cancelLabOrder } from "@/features/lab-orders/actions/cancel-lab-order";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function CancelLabOrderDialog({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    cancelLabOrder,
    initialFormState,
    {
      onSuccess: () => setOpen(false),
    },
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="outline" className="w-fit text-destructive" />}
      >
        Cancel lab order
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this lab order?</AlertDialogTitle>
            <AlertDialogDescription>
              The patient is told in the app and won&apos;t be asked to book
              these tests. You can order tests again while the visit is within
              its window.
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
              {pending ? "Cancelling…" : "Cancel order"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
