import type { StatusTone } from "@/components/shared/status-badge";
import type { BookingStatus } from "@/features/lab-dashboard/data/lab-dashboard";

export const bookingTones: Record<BookingStatus, StatusTone> = {
  Pending: "warning",
  "Sample collected": "info",
  Processing: "info",
  Completed: "success",
};
