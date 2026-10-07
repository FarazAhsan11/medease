import { ClockIcon, DropletIcon, InfoIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import type { BookableTest } from "@/features/lab-tests/data/lab-tests";
import { formatFee } from "@/lib/format";

type LabTestSummaryProps = {
  test: BookableTest;
};

export function LabTestSummary({ test }: LabTestSummaryProps) {
  const details = [
    { icon: DropletIcon, label: "Sample", value: test.sampleType },
    { icon: ClockIcon, label: "Results in", value: test.turnaround },
  ];

  return (
    <aside className="h-fit rounded-2xl border bg-card p-6">
      <h1 className="text-lg font-semibold">{test.name}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {test.description}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        {details.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <IconTile icon={icon} size="sm" />
            <div>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex gap-3 rounded-xl bg-warning-soft p-4 text-warning">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-medium">Before your test</p>
          <p className="mt-0.5 text-sm">{test.preparation}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">Price</span>
        <span className="text-lg font-semibold">{formatFee(test.price)}</span>
      </div>
    </aside>
  );
}
