import { CheckIcon, ClockIcon, HouseIcon, MapPinIcon } from "lucide-react";

import {
  formatTurnaround,
  packageSavings,
} from "@/features/lab-catalog/lib/lab-catalog";
import type { PackageOffer } from "@/features/lab-tests/data/lab-test-catalog";
import { formatFee } from "@/lib/format";

const SHOWN_TESTS = 6;

type LabPackageCardProps = {
  labPackage: PackageOffer;
};

export function LabPackageCard({ labPackage }: LabPackageCardProps) {
  const savings = packageSavings(labPackage.price, labPackage.separatePrice);
  const shown = labPackage.testNames.slice(0, SHOWN_TESTS);
  const more = labPackage.testNames.length - shown.length;

  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold break-words">
            {labPackage.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {labPackage.labName}
          </p>
        </div>
        {savings && (
          <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
            Save {savings}%
          </span>
        )}
      </div>
      {labPackage.description && (
        <p className="mt-2 text-sm text-muted-foreground">
          {labPackage.description}
        </p>
      )}

      <ul className="mt-4 grid flex-1 content-start gap-1.5 text-sm">
        {shown.map((name) => (
          <li key={name} className="flex items-start gap-2">
            <CheckIcon
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden
            />
            {name}
          </li>
        ))}
        {more > 0 && (
          <li className="pl-6 text-xs text-muted-foreground">
            and {more} more
          </li>
        )}
      </ul>

      <ul className="mt-4 grid gap-1 text-xs text-muted-foreground">
        <li className="flex items-start gap-1.5">
          <MapPinIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          <span className="break-words">{labPackage.labAddress}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5" aria-hidden />
          Results in {formatTurnaround(labPackage.turnaroundHours)}
        </li>
        {labPackage.homeCollection && (
          <li className="flex items-center gap-1.5">
            <HouseIcon className="size-3.5" aria-hidden />
            Home collection
          </li>
        )}
      </ul>

      <div className="mt-4 border-t pt-4">
        {savings && (
          <p className="text-xs text-muted-foreground line-through">
            {formatFee(labPackage.separatePrice)}
          </p>
        )}
        <p className="text-base font-semibold">{formatFee(labPackage.price)}</p>
      </div>
    </article>
  );
}
