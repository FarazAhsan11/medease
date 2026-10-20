import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { PrescriptionDisplayStatus } from "@/features/prescriptions/lib/prescriptions";

const labels: Record<PrescriptionDisplayStatus, [StatusTone, string]> = {
  active: ["success", "Active"],
  completed: ["muted", "Completed"],
  cancelled: ["danger", "Cancelled"],
  replaced: ["muted", "Updated"],
};

type PrescriptionStatusBadgeProps = {
  status: PrescriptionDisplayStatus;
};

export function PrescriptionStatusBadge({
  status,
}: PrescriptionStatusBadgeProps) {
  const [tone, label] = labels[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
