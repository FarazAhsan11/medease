import { SearchIcon } from "lucide-react";

import { FilterChips } from "@/components/shared/filter-chips";
import { Input } from "@/components/ui/input";
import { MedicineCard } from "@/features/medicines/components/medicine-card";
import {
  medicineCategories,
  type Medicine,
} from "@/features/medicines/data/medicines";

type MedicineCatalogProps = {
  medicines: Medicine[];
};

export function MedicineCatalog({ medicines }: MedicineCatalogProps) {
  return (
    <section className="min-w-0">
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search medicines"
          placeholder="Search medicines and health products"
          className="h-10 bg-card pl-9"
        />
      </div>
      <div className="mt-4">
        <FilterChips
          label="Medicine categories"
          options={medicineCategories}
          active="All"
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
        {medicines.map((medicine) => (
          <MedicineCard key={medicine.id} medicine={medicine} />
        ))}
      </div>
    </section>
  );
}
