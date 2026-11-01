import { SearchIcon } from "lucide-react";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type DoctorSearchBarProps = {
  specialties: readonly string[];
  action?: string;
  defaultValues?: { q?: string; specialty?: string };
  // Filters set elsewhere on the page, kept when searching again.
  keep?: { gender?: string; city?: string };
  className?: string;
};

export function DoctorSearchBar({
  specialties,
  action = "/find-doctor",
  defaultValues,
  keep = {},
  className,
}: DoctorSearchBarProps) {
  return (
    <Form
      role="search"
      action={action}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-soft sm:flex-row sm:items-center",
        className,
      )}
    >
      {Object.entries(keep).map(
        ([name, value]) =>
          value && <input key={name} type="hidden" name={name} value={value} />,
      )}
      <NativeSelect
        name="specialty"
        aria-label="Specialty"
        defaultValue={defaultValues?.specialty}
        className="w-full sm:w-48 [&_select]:h-10 [&_select]:border-0 [&_select]:bg-muted"
      >
        <NativeSelectOption value="">All specialties</NativeSelectOption>
        {specialties.map((specialty) => (
          <NativeSelectOption key={specialty} value={specialty}>
            {specialty}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className="relative flex-1">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          aria-label="Search doctors"
          defaultValue={defaultValues?.q}
          placeholder="Search by doctor name, specialty or city"
          className="h-10 border-0 pl-9 shadow-none focus-visible:ring-0"
        />
      </div>
      <Button type="submit" className="h-10 px-5">
        Search
      </Button>
    </Form>
  );
}
