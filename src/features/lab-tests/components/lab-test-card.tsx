import { ClockIcon, DropletIcon, HouseIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  categoryLabel,
  formatTurnaround,
  sampleTypeLabel,
} from "@/features/lab-catalog/lib/lab-catalog";
import type { CatalogTest } from "@/features/lab-tests/data/lab-test-catalog";
import { formatFee } from "@/lib/format";

type LabTestCardProps = {
  test: CatalogTest;
  href: string;
};

// One test as offered across labs: the lowest price and the fastest result.
export function LabTestCard({ test, href }: LabTestCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 transition-shadow hover:shadow-soft">
      <Badge variant="secondary">{categoryLabel(test.category)}</Badge>
      <h3 className="mt-3 text-sm font-semibold">{test.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {test.description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <DropletIcon className="size-3.5" aria-hidden />
          {sampleTypeLabel(test.sampleType)} sample
        </li>
        <li className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5" aria-hidden />
          {test.labCount > 1 ? "Results from " : "Results in "}
          {formatTurnaround(test.fastestHours)}
        </li>
        {test.homeCollection && (
          <li className="flex items-center gap-1.5">
            <HouseIcon className="size-3.5" aria-hidden />
            Home collection
          </li>
        )}
      </ul>
      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-sm font-semibold">
            {test.labCount > 1 && "From "}
            {formatFee(test.lowestPrice)}
          </p>
          <p className="text-xs text-muted-foreground">
            {test.labCount === 1 ? "1 lab" : `${test.labCount} labs`}
          </p>
        </div>
        <Link
          href={href}
          className={buttonVariants({ size: "sm", className: "h-8 px-3" })}
        >
          {test.labCount > 1 ? "Compare labs" : "View lab"}
        </Link>
      </div>
    </article>
  );
}
