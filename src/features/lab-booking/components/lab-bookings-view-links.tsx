import Link from "next/link";

import type { LabBookingsView } from "@/features/lab-booking/data/lab-bookings";
import { cn } from "@/lib/utils";

const views: { value: LabBookingsView; label: string }[] = [
  { value: "upcoming", label: "Today and upcoming" },
  { value: "past", label: "Earlier" },
];

type LabBookingsViewLinksProps = {
  basePath: string;
  active: LabBookingsView;
};

export function LabBookingsViewLinks({
  basePath,
  active,
}: LabBookingsViewLinksProps) {
  return (
    <nav
      aria-label="Bookings by date"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {views.map(({ value, label }) => (
        <Link
          key={value}
          href={value === "upcoming" ? basePath : `${basePath}?view=${value}`}
          aria-current={value === active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            value === active
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
