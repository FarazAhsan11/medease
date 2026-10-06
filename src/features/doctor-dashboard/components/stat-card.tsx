import { IconTile } from "@/components/shared/icon-tile";
import type { DashboardStat } from "@/features/doctor-dashboard/data/dashboard";

type StatCardProps = {
  stat: DashboardStat;
};

export function StatCard({ stat }: StatCardProps) {
  return (
    <div className="flex items-start justify-between rounded-2xl border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">{stat.label}</p>
        <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
      </div>
      <IconTile icon={stat.icon} size="sm" />
    </div>
  );
}
