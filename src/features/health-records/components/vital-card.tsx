import { IconTile } from "@/components/shared/icon-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Vital } from "@/features/health-records/data/health-records";

type VitalCardProps = {
  vital: Vital;
};

export function VitalCard({ vital }: VitalCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <IconTile icon={vital.icon} size="sm" />
        <StatusBadge tone={vital.tone}>{vital.status}</StatusBadge>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{vital.label}</p>
      <p className="mt-1">
        <span className="text-2xl font-semibold">{vital.value}</span>{" "}
        <span className="text-sm text-muted-foreground">{vital.unit}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Recorded {vital.recordedOn}
      </p>
    </div>
  );
}
