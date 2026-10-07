import { cn } from "@/lib/utils";

type FilterChipsProps = {
  label: string;
  options: string[];
  active: string;
};

export function FilterChips({ label, options, active }: FilterChipsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === active}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            option === active
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
