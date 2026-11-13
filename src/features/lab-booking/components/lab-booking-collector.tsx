import { UserRoundIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { AssignCollectorSelect } from "@/features/lab-booking/components/assign-collector-select";
import {
  itemsSummary,
  type LabBooking,
  type LabCollector,
} from "@/features/lab-booking/lib/lab-bookings";
import {
  labRoleCan,
  labRoleLabels,
  type LabMemberRole,
} from "@/features/lab-staff/lib/lab-permissions";

type LabBookingCollectorProps = {
  booking: LabBooking;
  role: LabMemberRole;
  viewerId: string;
  // The people a visit can go to; only for those who assign them.
  collectors?: LabCollector[];
};

// Who goes to a home visit (LAB-06): a picker while it's still to collect,
// for those who assign; otherwise the collector's name, or "Assigned to you".
export function LabBookingCollector({
  booking,
  role,
  viewerId,
  collectors,
}: LabBookingCollectorProps) {
  if (booking.collection !== "home") return null;

  const open =
    booking.status === "booked" || booking.status === "recollection_needed";
  if (open && collectors && labRoleCan(role, "bookings.assign")) {
    const options = collectors.map((person) => {
      // Their other visits that day: this one, if theirs, isn't extra work.
      const others =
        (person.visits[booking.visitDate] ?? 0) -
        (booking.collectorId === person.id ? 1 : 0);
      return {
        id: person.id,
        label: [
          person.id === viewerId ? `${person.name} (you)` : person.name,
          labRoleLabels[person.role],
          others > 0 &&
            `${others} other ${others === 1 ? "visit" : "visits"} that day`,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    });

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Collector</span>
        <AssignCollectorSelect
          bookingId={booking.id}
          collectorId={booking.collectorId}
          options={options}
          summary={`${booking.careRecipientName} · ${itemsSummary(booking.items)}`}
        />
        {!booking.collectorId && (
          <StatusBadge tone="warning">Nobody assigned</StatusBadge>
        )}
      </div>
    );
  }

  if (!booking.collectorId) return null;
  const mine = booking.collectorId === viewerId;
  const name = collectors?.find(
    (person) => person.id === booking.collectorId,
  )?.name;
  if (!mine && !name) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <UserRoundIcon className="size-3.5" aria-hidden />
      {mine ? (
        <span className="font-medium text-foreground">Assigned to you</span>
      ) : (
        `Collector: ${name}`
      )}
    </p>
  );
}
