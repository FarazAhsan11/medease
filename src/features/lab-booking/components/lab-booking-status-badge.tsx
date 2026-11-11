import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import {
  statusLabels,
  type LabBookingStatus,
} from "@/features/lab-booking/lib/lab-bookings";

const tones: Record<LabBookingStatus, StatusTone> = {
  awaiting_payment: "warning",
  booked: "info",
  sample_collected: "info",
  processing: "warning",
  report_ready: "success",
  cancelled: "muted",
  recollection_needed: "warning",
};

export function LabBookingStatusBadge({
  status,
}: {
  status: LabBookingStatus;
}) {
  return (
    <StatusBadge tone={tones[status]} dot>
      {statusLabels[status]}
    </StatusBadge>
  );
}
