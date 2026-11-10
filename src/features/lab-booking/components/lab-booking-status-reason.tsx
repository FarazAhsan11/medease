import { InfoIcon } from "lucide-react";

import {
  reasonLabels,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type LabBookingStatusReasonProps = {
  booking: Pick<
    LabBooking,
    | "status"
    | "statusReason"
    | "statusNote"
    | "statusChangedAt"
    | "timezone"
    | "cancelledBy"
  >;
  // Who reads it: the patient gets what happens next.
  audience: "patient" | "lab";
};

// Why a booking was cancelled or needs a new sample, with the note from
// whoever did it: the lab, or the patient cancelling (LAB-20).
export function LabBookingStatusReason({
  booking,
  audience,
}: LabBookingStatusReasonProps) {
  if (!booking.statusReason) return null;
  const recollect = booking.status === "recollection_needed";
  const reason = reasonLabels[booking.statusReason];
  const byPatient = booking.cancelledBy === "patient";
  const title = recollect
    ? "New sample needed"
    : byPatient
      ? audience === "patient"
        ? "You cancelled"
        : "Cancelled by the patient"
      : "Cancelled";

  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-xl p-3 text-sm",
        recollect ? "bg-warning-soft" : "bg-muted",
      )}
    >
      <InfoIcon
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {title}
          <span className="font-normal text-muted-foreground">
            {" "}
            · {formatDateTime(booking.statusChangedAt, booking.timezone)}
          </span>
        </p>
        {booking.statusReason !== "other" && <p>{reason}.</p>}
        {booking.statusNote && (
          <p className="break-words whitespace-pre-line text-muted-foreground">
            {booking.statusNote}
          </p>
        )}
        {recollect && audience === "patient" && (
          <p className="text-muted-foreground">
            The lab will contact you to take a new sample. You can also call
            them.
          </p>
        )}
      </div>
    </div>
  );
}
