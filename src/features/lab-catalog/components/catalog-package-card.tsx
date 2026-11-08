import { EyeOffIcon } from "lucide-react";

import { CatalogListedSwitch } from "@/features/lab-catalog/components/catalog-listed-switch";
import { DeleteLabPackageDialog } from "@/features/lab-catalog/components/delete-lab-package-dialog";
import { LabPackageSheet } from "@/features/lab-catalog/components/lab-package-sheet";
import type {
  LabCatalogPackage,
  LabCatalogTest,
} from "@/features/lab-catalog/data/lab-catalog";
import {
  formatTurnaround,
  packageSavings,
} from "@/features/lab-catalog/lib/lab-catalog";
import { formatFee } from "@/lib/format";

type CatalogPackageCardProps = {
  labPackage: LabCatalogPackage;
  // Every test in the lab's catalog.
  tests: LabCatalogTest[];
};

// One of the lab's packages, worked out from its tests the way patients see it.
export function CatalogPackageCard({
  labPackage,
  tests,
}: CatalogPackageCardProps) {
  const included = tests.filter((test) => labPackage.testIds.includes(test.id));
  const separatePrice = included.reduce((sum, test) => sum + test.price, 0);
  const savings = packageSavings(labPackage.price, separatePrice);
  const slowest = Math.max(...included.map((test) => test.turnaroundHours));
  const unlisted = included.filter((test) => !test.listed);

  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold break-words">
            {labPackage.name}
          </h3>
          {labPackage.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {labPackage.description}
            </p>
          )}
        </div>
        <CatalogListedSwitch
          kind="package"
          id={labPackage.id}
          listed={labPackage.listed}
          label={`List ${labPackage.name} for patients`}
        />
      </div>

      <p className="mt-3 flex-1 text-xs text-muted-foreground">
        {included.length} tests: {included.map((test) => test.name).join(", ")}
      </p>

      {labPackage.listed && unlisted.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning">
          <EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Hidden from patients while{" "}
          {unlisted.map((test) => test.name).join(", ")}{" "}
          {unlisted.length === 1 ? "is" : "are"} unlisted.
        </p>
      )}

      <div className="mt-4 flex items-end justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-base font-semibold">
            {formatFee(labPackage.price)}
          </p>
          <p className="text-xs text-muted-foreground">
            {savings
              ? `Saves ${savings}% on ${formatFee(separatePrice)}`
              : `${formatFee(separatePrice)} booked one by one`}
            {included.length > 0 && ` · ${formatTurnaround(slowest)}`}
          </p>
        </div>
        <div className="flex gap-1">
          <LabPackageSheet tests={tests} labPackage={labPackage} />
          <DeleteLabPackageDialog
            packageId={labPackage.id}
            name={labPackage.name}
          />
        </div>
      </div>
    </article>
  );
}
