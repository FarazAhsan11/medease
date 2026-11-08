import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatFee } from "@/lib/format";

type LabBookingSummaryProps = {
  subtotal: number;
  home: boolean;
  // Home collection only: null until an address is chosen, 0 when waived.
  collectionFee: number | null;
  // What's still missing before booking, or null when ready.
  missing: string | null;
  pending: boolean;
};

export function LabBookingSummary({
  subtotal,
  home,
  collectionFee,
  missing,
  pending,
}: LabBookingSummaryProps) {
  const total = subtotal + (home ? (collectionFee ?? 0) : 0);

  return (
    <div className="grid gap-4 rounded-xl bg-muted p-4">
      <dl className="grid gap-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tests</dt>
          <dd>{formatFee(subtotal)}</dd>
        </div>
        {home && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Home collection</dt>
            <dd>
              {collectionFee === null
                ? "Depends on the address"
                : collectionFee === 0
                  ? "Free"
                  : formatFee(collectionFee)}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t pt-1.5 font-semibold">
          <dt>Total</dt>
          <dd>{formatFee(total)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {home ? "Pay the collector in cash." : "Pay in cash at the lab."} Online
        payment is coming soon.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{missing}</p>
        <Button
          type="submit"
          disabled={missing !== null || pending}
          className="h-9 gap-2 px-5"
        >
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Booking…" : "Confirm booking"}
        </Button>
      </div>
    </div>
  );
}
