import { ClockIcon, FlaskConicalIcon, HomeIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { formatTurnaround } from "@/features/lab-catalog/lib/lab-catalog";
import type { LabOrderOffer } from "@/features/lab-orders/data/lab-orders";
import type { LabOrderTest } from "@/features/lab-orders/lib/lab-orders";
import { formatFee } from "@/lib/format";

type LabOrderOfferListProps = {
  orderId: string;
  tests: LabOrderTest[];
  // Labs doing the most tests first, then the cheapest.
  offers: LabOrderOffer[];
};

// Labs compared for a whole order: price for the tests each one does, the
// slowest result among them, and what it doesn't do.
export function LabOrderOfferList({
  orderId,
  tests,
  offers,
}: LabOrderOfferListProps) {
  if (offers.length === 0) {
    return (
      <EmptyState
        icon={FlaskConicalIcon}
        title="No lab on MedEase does these tests yet"
        description="You can take your doctor's order to any lab near you."
      />
    );
  }

  const complete = offers.filter(
    (offer) => offer.testIds.length === tests.length,
  ).length;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">
          {complete === 0
            ? "No single lab does every test"
            : complete === 1
              ? "1 lab does every test"
              : `${complete} labs do every test`}
        </h2>
        <p className="text-sm text-muted-foreground">
          Prices are for the tests each lab does. Your doctor&apos;s tests are
          chosen for you when you book.
        </p>
      </div>
      <ul className="grid gap-3">
        {offers.map((offer) => {
          const missing = tests.filter(
            (test) => !offer.testIds.includes(test.id),
          );
          return (
            <li key={offer.labId} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold break-words">
                    {offer.labName}
                  </h3>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPinIcon
                      className="mt-px size-3.5 shrink-0"
                      aria-hidden
                    />
                    <span className="break-words">{offer.labAddress}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold">
                    {formatFee(offer.totalPrice)}
                  </p>
                  <Link
                    href={patientRoutes.bookLab(offer.labId, {
                      order: orderId,
                    })}
                    className={buttonVariants({
                      size: "sm",
                      className: "px-4",
                    })}
                    aria-label={`Book at ${offer.labName}`}
                  >
                    Book
                  </Link>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs">
                <li
                  className={
                    missing.length === 0
                      ? "rounded-full bg-success-soft px-2 py-0.5 font-medium text-success"
                      : "rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning"
                  }
                >
                  {missing.length === 0
                    ? "Every test"
                    : `${offer.testIds.length} of ${tests.length} tests`}
                </li>
                <li className="flex items-center gap-1.5 text-muted-foreground">
                  <ClockIcon className="size-3.5" aria-hidden />
                  Results in {formatTurnaround(offer.turnaroundHours)}
                </li>
                {offer.homeCollection && (
                  <li className="flex items-center gap-1.5 text-muted-foreground">
                    <HomeIcon className="size-3.5" aria-hidden />
                    Home collection
                  </li>
                )}
              </ul>
              {missing.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Not done here:
                  </span>{" "}
                  {missing.map((test) => test.name).join(", ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
