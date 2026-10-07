import { PillIcon, PlusIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { Medicine } from "@/features/medicines/data/medicines";
import { formatFee } from "@/lib/format";

type MedicineCardProps = {
  medicine: Medicine;
};

export function MedicineCard({ medicine }: MedicineCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-4 transition-shadow hover:shadow-soft">
      <div className="relative flex aspect-[4/3] items-center justify-center rounded-xl bg-secondary">
        <PillIcon className="size-10 text-primary/70" aria-hidden />
        {medicine.requiresPrescription && (
          <StatusBadge tone="warning" className="absolute top-2 left-2">
            Rx required
          </StatusBadge>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{medicine.category}</p>
      <h3 className="mt-0.5 text-sm font-semibold">
        {medicine.name} {medicine.strength}
      </h3>
      <p className="text-xs text-muted-foreground">
        {medicine.form} · {medicine.packSize}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-semibold">{formatFee(medicine.price)}</p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          aria-label={`Add ${medicine.name} to cart`}
        >
          <PlusIcon aria-hidden />
          Add
        </Button>
      </div>
    </article>
  );
}
