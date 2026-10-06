import { SlidersHorizontalIcon } from "lucide-react";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { specialties } from "@/features/doctors/data/doctors";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const selectFilters = [
  { id: "filter-type", label: "Specialty", options: specialties },
  { id: "filter-gender", label: "Gender", options: ["Male", "Female"] },
  { id: "filter-rating", label: "Rating", options: ["4.5 & up", "4.0 & up"] },
];

export function DoctorFilters() {
  return (
    <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-20">
      <div className="flex items-center gap-2">
        <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">Filters</h2>
      </div>

      <form className="mt-5 grid gap-4">
        {selectFilters.map((filter) => (
          <FormField key={filter.id} id={filter.id} label={filter.label}>
            <NativeSelect id={filter.id} className="w-full">
              <NativeSelectOption value="">Any</NativeSelectOption>
              {filter.options.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {option}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        ))}

        <FormField id="filter-location" label="Location">
          <Input id="filter-location" placeholder="City or area" />
        </FormField>

        <fieldset>
          <legend className="text-sm font-medium">Availability</legend>
          <div className="mt-2 grid grid-cols-4 gap-2 lg:grid-cols-3">
            {weekDays.map((day) => (
              <label
                key={day}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Checkbox name="days" value={day} />
                {day}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button type="reset" variant="outline">
            Reset
          </Button>
          <Button type="button">Apply</Button>
        </div>
      </form>
    </aside>
  );
}
