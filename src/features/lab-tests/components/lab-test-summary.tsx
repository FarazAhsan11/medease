import { DropletIcon, InfoIcon, LayersIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import {
  categoryLabel,
  sampleTypeLabel,
} from "@/features/lab-catalog/lib/lab-catalog";
import type { LabTestDetails } from "@/features/lab-tests/data/lab-test-catalog";

type LabTestSummaryProps = {
  test: LabTestDetails;
};

export function LabTestSummary({ test }: LabTestSummaryProps) {
  const details = [
    {
      icon: DropletIcon,
      label: "Sample",
      value: sampleTypeLabel(test.sampleType),
    },
    {
      icon: LayersIcon,
      label: "Category",
      value: categoryLabel(test.category),
    },
  ];

  return (
    <aside className="h-fit rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">{test.name}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {test.description}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        {details.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <IconTile icon={icon} size="sm" />
            <div className="min-w-0">
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
    </aside>
  );
}
