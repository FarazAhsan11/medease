import {
  ClockIcon,
  FlaskConicalIcon,
  HouseIcon,
  MapPinIcon,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { formatTurnaround } from "@/features/lab-catalog/lib/lab-catalog";
import type { LabTestOffer } from "@/features/lab-tests/data/lab-test-catalog";
import { formatFee } from "@/lib/format";

type LabOfferListProps = {
  // The cheapest offers, up to MAX_OFFERS.
  offers: LabTestOffer[];
  // Every lab offering the test, shown or not.
  total: number;
  // The shared note; a lab's own note is shown only when it differs.
  sharedPreparation: string;
};

// The labs offering one test, cheapest first.
export function LabOfferList({
  offers,
  total,
  sharedPreparation,
}: LabOfferListProps) {
  if (offers.length === 0) {
    return (
      <EmptyState
        icon={FlaskConicalIcon}
        title="No lab offers this test yet"
        description="Verified labs will list their prices here. Try another test in the meantime."
      />
    );
  }

  // The fastest lab may be past the cheapest shown, so that badge needs them all.
  const complete = offers.length === total;
  const fastest = Math.min(...offers.map((offer) => offer.turnaroundHours));
  const cheapest = offers[0].price;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">
          {total === 1
            ? "1 lab offers this test"
            : `${total} labs offer this test`}
        </h2>
        <p className="text-sm text-muted-foreground">
          {complete
            ? "Compare prices and turnaround here."
            : `The ${offers.length} lowest prices are shown here.`}{" "}
          Booking a lab test on MedEase opens soon.
        </p>
      </div>
      <ul className="grid gap-3">
        {offers.map((offer) => (
          <li key={offer.id} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold break-words">
                  {offer.labName}
                </h3>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPinIcon className="mt-px size-3.5 shrink-0" aria-hidden />
                  <span className="break-words">{offer.labAddress}</span>
                </p>
              </div>
              <p className="text-base font-semibold">
                {formatFee(offer.price)}
              </p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {offers.length > 1 && offer.price === cheapest && (
                <li className="rounded-full bg-success-soft px-2 py-0.5 font-medium text-success">
                  Lowest price
                </li>
              )}
              {complete &&
                offers.length > 1 &&
                offer.turnaroundHours === fastest && (
                  <li className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                    Fastest result
                  </li>
                )}
              <li className="flex items-center gap-1.5 text-muted-foreground">
                <ClockIcon className="size-3.5" aria-hidden />
                Results in {formatTurnaround(offer.turnaroundHours)}
              </li>
              {offer.homeCollection && (
                <li className="flex items-center gap-1.5 text-muted-foreground">
                  <HouseIcon className="size-3.5" aria-hidden />
                  Home collection
                </li>
              )}
            </ul>
            {offer.preparation !== sharedPreparation && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  This lab asks:
                </span>{" "}
                {offer.preparation}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
