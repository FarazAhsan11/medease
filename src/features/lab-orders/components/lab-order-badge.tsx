import { StatusBadge } from "@/components/shared/status-badge";
import type { LabOrder } from "@/features/lab-orders/lib/lab-orders";

// "Cancelled" or "Urgent"; nothing for a routine order.
export function LabOrderBadge({
  order,
}: {
  order: Pick<LabOrder, "status" | "priority">;
}) {
  if (order.status === "cancelled") {
    return <StatusBadge tone="danger">Cancelled</StatusBadge>;
  }
  if (order.priority === "urgent") {
    return <StatusBadge tone="warning">Urgent</StatusBadge>;
  }
  return null;
}
