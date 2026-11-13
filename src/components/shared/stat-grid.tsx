import { StatCard, type Stat } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";

type StatGridProps = {
  stats: Stat[];
};

// Columns on wide screens, by how many stats there are.
const wideColumns: Record<number, string> = {
  2: "xl:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "lg:grid-cols-3 xl:grid-cols-5",
  6: "lg:grid-cols-3",
};

export function StatGrid({ stats }: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        wideColumns[stats.length] ?? "xl:grid-cols-4",
      )}
    >
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
