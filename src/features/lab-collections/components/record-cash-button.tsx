"use client";

import { BanknoteIcon, Loader2Icon } from "lucide-react";
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
import { recordCash } from "@/features/lab-collections/actions/record-cash";
import { useFormAction } from "@/hooks/use-form-action";
import { formatFee } from "@/lib/format";
import { initialFormState } from "@/lib/form-state";

type RecordCashButtonProps = {
  bookingId: string;
  amount: number;
  // "Ali Raza · CBC, HbA1c"
  summary: string;
};

// Cash taken for a booking, confirmed first: it can't be undone here.
export function RecordCashButton({
  bookingId,
  amount,
  summary,
}: RecordCashButtonProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(recordCash, initialFormState, {
    onSuccess: () => setOpen(false),
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <BanknoteIcon aria-hidden />
        Record cash
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="amount" value={amount} />
          <AlertDialogHeader>
            <AlertDialogTitle>Record {formatFee(amount)} in cash?</AlertDialogTitle>
            <AlertDialogDescription>
              {summary}. Record it once you have the full amount. The patient
              sees the booking as paid, and it counts in your cash for today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              Record cash
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
