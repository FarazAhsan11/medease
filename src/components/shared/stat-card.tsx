import type { LucideIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";

export type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

type StatCardProps = {
  stat: Stat;
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
