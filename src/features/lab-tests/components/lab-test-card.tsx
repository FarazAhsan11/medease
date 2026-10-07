import { ClockIcon, DropletIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { LabTest } from "@/features/lab-tests/data/lab-tests";
import { formatFee } from "@/lib/format";

type LabTestCardProps = {
  test: LabTest;
};

export function LabTestCard({ test }: LabTestCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 transition-shadow hover:shadow-soft">
      <Badge variant="secondary">{test.category}</Badge>
      <h3 className="mt-3 text-sm font-semibold">{test.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {test.description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <DropletIcon className="size-3.5" aria-hidden />
          {test.sampleType} sample
        </li>
        <li className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5" aria-hidden />
          Results in {test.turnaround.toLowerCase()}
        </li>
      </ul>
      <div className="mt-5 flex items-center justify-between border-t pt-4">
        <p className="text-sm font-semibold">{formatFee(test.price)}</p>
        <Link
          href={`/lab-tests/${test.id}`}
          className={buttonVariants({ size: "sm", className: "h-8 px-3" })}
        >
          Book test
        </Link>
      </div>
    </article>
  );
}
