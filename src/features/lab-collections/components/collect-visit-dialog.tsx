"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { collectVisit } from "@/features/lab-collections/actions/collect-visit";
import { useFormAction } from "@/hooks/use-form-action";
import { formatFee } from "@/lib/format";
import { initialFormState } from "@/lib/form-state";

type CollectVisitDialogProps = {
  bookingId: string;
  fromStatus: "booked" | "recollection_needed";
  // "Ali Raza · CBC, HbA1c"
  summary: string;
  // The total to take in cash; null when nothing is owed (paid online).
  cashDue: number | null;
  // A small button among a list's other actions; large on a phone card.
  compact?: boolean;
};

// Marking a home visit collected, with the cash on a cash booking, which is
// ticked by default since the collector takes it after the draw.
export function CollectVisitDialog(props: CollectVisitDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size={props.compact ? "sm" : "default"}
            className={props.compact ? "gap-1.5" : "h-10 gap-1.5"}
          />
        }
      >
        <CheckIcon aria-hidden />
        Sample collected
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* Mounted per opening, so the box starts ticked each time. */}
        <CollectForm {...props} onDone={() => setOpen(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CollectForm({
  bookingId,
  fromStatus,
  summary,
  cashDue,
  onDone,
}: Omit<CollectVisitDialogProps, "compact"> & { onDone: () => void }) {
  const [cashTaken, setCashTaken] = useState(cashDue !== null);
  const { pending, onSubmit } = useFormAction(collectVisit, initialFormState, {
    onSuccess: onDone,
  });

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="fromStatus" value={fromStatus} />
      {cashDue !== null && cashTaken && (
        <>
          <input type="hidden" name="cashTaken" value="on" />
          <input type="hidden" name="amount" value={cashDue} />
        </>
      )}
      <AlertDialogHeader>
        <AlertDialogTitle>Mark the sample collected?</AlertDialogTitle>
        <AlertDialogDescription>
          {summary}. The patient is told the sample has been taken.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {cashDue !== null && (
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={cashTaken}
            onCheckedChange={(checked) => setCashTaken(checked)}
          />
          <span>
            <span className="block font-medium">
              I took {formatFee(cashDue)} in cash
            </span>
            <span className="block text-xs text-muted-foreground">
              Untick if the patient will pay at the lab. The booking then stays
              unpaid.
            </span>
          </span>
        </label>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {cashDue !== null && cashTaken
            ? "Collected and paid"
            : "Mark collected"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
