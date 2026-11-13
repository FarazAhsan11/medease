import { labRoutes } from "@/config/routes";
import { LabBookingForwardButton } from "@/features/lab-booking/components/lab-booking-forward-button";
import { LabBookingReasonDialog } from "@/features/lab-booking/components/lab-booking-reason-dialog";
import {
  itemsSummary,
  nextStatuses,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { LabReportLink } from "@/features/lab-reports/components/lab-report-link";
import { UploadReportDialog } from "@/features/lab-reports/components/upload-report-dialog";
import {
  labRoleCan,
  permissionForMove,
  type LabMemberRole,
} from "@/features/lab-staff/lib/lab-permissions";
import { toDateKey } from "@/lib/datetime";

type LabBookingActionsProps = {
  booking: LabBooking;
  // The viewer's role in the lab: only the moves it allows are offered.
  role: LabMemberRole;
};

// What the lab can do next with a booking, or its report once it's done. The
// database checks each move.
export function LabBookingActions({ booking, role }: LabBookingActionsProps) {
  const can = (status: string) => labRoleCan(role, permissionForMove(status));
  const next = nextStatuses[booking.status].filter(can);
  if (next.length === 0) {
    return booking.reportId && labRoleCan(role, "reports.view") ? (
      <div className="border-t pt-4">
        <LabReportLink href={labRoutes.report(booking.reportId)} />
      </div>
    ) : null;
  }

  const forward = next.find(
    (status) => status !== "recollection_needed" && status !== "cancelled",
  );
  // A sample is taken from the booked day on.
  const beforeVisit =
    booking.status === "booked" &&
    toDateKey(new Date(), booking.timezone) < booking.visitDate;
  const summary = `${booking.careRecipientName} · ${itemsSummary(booking.items)}`;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {forward === "report_ready" ? (
        <UploadReportDialog bookingId={booking.id} summary={summary} />
      ) : (
        forward &&
        (beforeVisit ? (
          <p className="text-xs text-muted-foreground">
            Mark the sample collected from the booked day.
          </p>
        ) : (
          <LabBookingForwardButton
            bookingId={booking.id}
            fromStatus={booking.status}
            toStatus={forward}
          />
        ))
      )}
      {next.includes("recollection_needed") && (
        <LabBookingReasonDialog
          bookingId={booking.id}
          fromStatus={booking.status}
          toStatus="recollection_needed"
          summary={summary}
        />
      )}
      {next.includes("cancelled") && (
        <LabBookingReasonDialog
          bookingId={booking.id}
          fromStatus={booking.status}
          toStatus="cancelled"
          summary={summary}
        />
      )}
    </div>
  );
}
