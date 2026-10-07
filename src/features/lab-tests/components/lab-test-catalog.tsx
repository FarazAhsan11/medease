import { SearchIcon } from "lucide-react";

import { FilterChips } from "@/components/shared/filter-chips";
import { Input } from "@/components/ui/input";
import { LabTestCard } from "@/features/lab-tests/components/lab-test-card";
import {
  labCategories,
  type LabTest,
} from "@/features/lab-tests/data/lab-tests";

type LabTestCatalogProps = {
  tests: LabTest[];
};

export function LabTestCatalog({ tests }: LabTestCatalogProps) {
  return (
    <section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold">Individual tests</h2>
        <div className="relative lg:w-80">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search tests"
            placeholder="Search tests, e.g. vitamin D"
            className="h-9 bg-card pl-9"
          />
        </div>
      </div>
      <div className="mt-4">
        <FilterChips
          label="Test categories"
          options={labCategories}
          active="All tests"
        />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => (
          <LabTestCard key={test.id} test={test} />
        ))}
      </div>
    </section>
  );
}
