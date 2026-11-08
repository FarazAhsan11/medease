import { SearchIcon } from "lucide-react";
import Form from "next/form";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchFormProps = {
  action: string;
  defaultValue: string;
  label: string;
  placeholder: string;
  // Other filters on the page, kept when searching again.
  keep?: Record<string, string>;
  className?: string;
};

// A GET search box: the query lands in the URL as `q`, so results can be
// shared and work without JavaScript. Enter submits.
export function SearchForm({
  action,
  defaultValue,
  label,
  placeholder,
  keep = {},
  className,
}: SearchFormProps) {
  return (
    <Form action={action} role="search" className={cn("relative", className)}>
      {Object.entries(keep).map(
        ([name, value]) =>
          value && <input key={name} type="hidden" name={name} value={value} />,
      )}
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      {/* Keyed so a new search on the same page shows its own text. */}
      <Input
        key={defaultValue}
        type="search"
        name="q"
        defaultValue={defaultValue}
        aria-label={label}
        placeholder={placeholder}
        maxLength={80}
        className="h-9 bg-card pl-9"
      />
    </Form>
  );
}
