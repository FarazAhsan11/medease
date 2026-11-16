import { labRoutes } from "@/config/routes";
import { LabBookingForwardButton } from "@/features/lab-booking/components/lab-booking-forward-button";
import { LabBookingReasonDialog } from "@/features/lab-booking/components/lab-booking-reason-dialog";
import {
  itemsSummary,
  nextStatuses,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { CollectVisitDialog } from "@/features/lab-collections/components/collect-visit-dialog";
import { RecordCashButton } from "@/features/lab-collections/components/record-cash-button";
import { takesCash } from "@/features/lab-collections/lib/collections";
import { LabReportLink } from "@/features/lab-reports/components/lab-report-link";
import { ReportSignerNote } from "@/features/lab-reports/components/report-signer-note";
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
  const summary = `${booking.careRecipientName} · ${itemsSummary(booking.items)}`;
  const owesCash = takesCash(booking);
  // Cash taken at the counter, or caught up later (LAB-21).
  const cash = owesCash && labRoleCan(role, "bookings.collect") && (
    <RecordCashButton
      bookingId={booking.id}
      amount={booking.total}
      summary={summary}
    />
  );
  if (next.length === 0) {
    const report = booking.reportId && labRoleCan(role, "reports.view");
    if (!report && !cash) return null;
    return (
      <div className="grid gap-2 border-t pt-4">
        {cash && <div>{cash}</div>}
        {report && booking.reportId && (
          <LabReportLink
            href={labRoutes.report(booking.reportId)}
            className="w-fit"
          />
        )}
        {report && booking.reportSigner && (
          <ReportSignerNote signer={booking.reportSigner} />
        )}
      </div>
    );
  }

  const forward = next.find(
    (status) => status !== "recollection_needed" && status !== "cancelled",
  );
  // A sample is taken from the booked day on.
  const beforeVisit =
    booking.status === "booked" &&
    toDateKey(new Date(), booking.timezone) < booking.visitDate;
  // A cash booking is collected with its cash, in one step (LAB-21).
  const collectsCash =
    forward === "sample_collected" && !beforeVisit && owesCash;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {forward === "report_ready" ? (
        booking.pendingReportId ? (
          // Signed off or sent back from the Reports page (LAB-17).
          <>
            <LabReportLink href={labRoutes.report(booking.pendingReportId)} />
            <a
              href={labRoutes.reports}
              className="text-xs font-medium text-primary hover:underline"
            >
              Waiting for sign-off
            </a>
          </>
        ) : (
          <UploadReportDialog
            bookingId={booking.id}
            summary={summary}
            canSign={labRoleCan(role, "reports.sign")}
          />
        )
      ) : (
        forward &&
        (beforeVisit ? (
          <p className="text-xs text-muted-foreground">
            Mark the sample collected from the booked day.
          </p>
        ) : collectsCash ? (
          <CollectVisitDialog
            bookingId={booking.id}
            fromStatus={booking.status as "booked" | "recollection_needed"}
            summary={summary}
            cashDue={booking.total}
            compact
          />
        ) : (
          <LabBookingForwardButton
            bookingId={booking.id}
            fromStatus={booking.status}
            toStatus={forward}
          />
        ))
      )}
      {!collectsCash && cash}
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
