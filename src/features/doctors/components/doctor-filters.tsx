import { SlidersHorizontalIcon } from "lucide-react";
import Link from "next/link";

import { FormField } from "@/components/shared/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  genders,
  specializations,
} from "@/features/auth/data/registration-options";
import type { DoctorSearch } from "@/features/doctors/data/doctor-directory";

type DoctorFiltersProps = {
  action: string;
  search: DoctorSearch;
};

// A plain GET form: filters live in the URL, so results are shareable and
// work without JavaScript.
export function DoctorFilters({ action, search }: DoctorFiltersProps) {
  return (
    <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-20">
      <div className="flex items-center gap-2">
        <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">Filters</h2>
      </div>

      <form action={action} className="mt-5 grid gap-4">
        {search.q && <input type="hidden" name="q" value={search.q} />}
        <FormField id="filter-specialty" label="Specialty">
          <NativeSelect
            id="filter-specialty"
            name="specialty"
            defaultValue={search.specialty}
            className="w-full"
          >
            <NativeSelectOption value="">Any</NativeSelectOption>
            {specializations.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="filter-gender" label="Gender">
          <NativeSelect
            id="filter-gender"
            name="gender"
            defaultValue={search.gender}
            className="w-full"
          >
            <NativeSelectOption value="">Any</NativeSelectOption>
            {genders.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="filter-city" label="City">
          <Input
            id="filter-city"
            name="city"
            defaultValue={search.city}
            placeholder="e.g. Lahore"
          />
        </FormField>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <Link
            href={action}
            className={buttonVariants({ variant: "outline" })}
          >
            Reset
          </Link>
          <Button type="submit">Apply</Button>
        </div>
      </form>
    </aside>
  );
}
