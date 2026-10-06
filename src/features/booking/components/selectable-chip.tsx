import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SelectableChipProps = {
  active: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
};

export function SelectableChip({
  active,
  onSelect,
  className,
  children,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "group rounded-xl border text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:border-primary/40 hover:bg-secondary",
        className,
      )}
    >
      {children}
    </button>
  );
}
