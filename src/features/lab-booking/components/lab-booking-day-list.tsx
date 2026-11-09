import { LabBookingEntry } from "@/features/lab-booking/components/lab-booking-entry";
import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import { formatDate } from "@/lib/datetime";

type LabBookingDayListProps = {
  bookings: LabBooking[];
  // Shown under the list when there were more than it holds.
  more?: string;
  // Days before this one are marked as left over, for open bookings.
  markBefore?: string;
};

// Bookings in the order given, under a heading per visit day.
function byDay(bookings: LabBooking[]) {
  const days = new Map<string, LabBooking[]>();
  for (const booking of bookings) {
    const day = days.get(booking.visitDate);
    if (day) day.push(booking);
    else days.set(booking.visitDate, [booking]);
  }
  return [...days.entries()];
}

export function LabBookingDayList({
  bookings,
  more,
  markBefore,
}: LabBookingDayListProps) {
  return (
    <div className="space-y-6">
      {byDay(bookings).map(([day, entries]) => (
        <section key={day} className="space-y-3">
          <h3 className="text-sm font-semibold">
            {formatDate(`${day}T12:00:00Z`, "UTC")}{" "}
            <span className="font-normal text-muted-foreground">
              ({entries.length})
            </span>
            {markBefore && day < markBefore && (
              <span className="ml-2 font-normal text-warning">Earlier day</span>
            )}
          </h3>
          {entries.map((booking) => (
            <LabBookingEntry key={booking.id} booking={booking} />
          ))}
        </section>
      ))}
      {more && (
        <p className="text-center text-xs text-muted-foreground">{more}</p>
      )}
    </div>
  );
}
