import { PanelCard } from "@/components/shared/panel-card";
import {
  formatBookingWhen,
  itemsSummary,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { UploadReportDialog } from "@/features/lab-reports/components/upload-report-dialog";

type AwaitingReportsCardProps = {
  bookings: LabBooking[];
  more: boolean;
  // Front desk staff see the list but don't upload.
  canUpload: boolean;
};

// Bookings the lab is processing, each waiting for its report.
export function AwaitingReportsCard({
  bookings,
  more,
  canUpload,
}: AwaitingReportsCardProps) {
  return (
    <PanelCard
      title="Waiting for a report"
      description={
        bookings.length === 0
          ? "Bookings appear here once you start processing them."
          : `${bookings.length}${more ? "+" : ""} being processed, longest waiting first`
      }
    >
      {bookings.length > 0 && (
        <ul className="divide-y">
          {bookings.map((booking) => {
            const items = itemsSummary(booking.items);
            return (
              <li
                key={booking.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">
                    {booking.careRecipientName}
                  </p>
                  <p className="text-xs break-words text-muted-foreground">
                    {items} · {formatBookingWhen(booking)}
                  </p>
                </div>
                {canUpload && (
                  <UploadReportDialog
                    bookingId={booking.id}
                    summary={`${booking.careRecipientName} · ${items}`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
