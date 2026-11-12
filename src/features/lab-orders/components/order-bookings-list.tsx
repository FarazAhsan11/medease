import { LabBookingStatusBadge } from "@/features/lab-booking/components/lab-booking-status-badge";
import {
  testNames,
  type LabOrder,
  type OrderBooking,
} from "@/features/lab-orders/lib/lab-orders";

type OrderBookingsListProps = {
  order: Pick<LabOrder, "tests">;
  bookings: OrderBooking[];
};

// The patient's bookings made from a doctor's order: which lab has which of
// the ordered tests, and how far each has got.
export function OrderBookingsList({ order, bookings }: OrderBookingsListProps) {
  if (bookings.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Booked</h2>
        <p className="text-sm text-muted-foreground">
          Your doctor gets these reports too. Follow them under Lab tests.
        </p>
      </div>
      <ul className="grid gap-3">
        {bookings.map((booking) => (
          <li
            key={booking.id}
            className="grid gap-1 rounded-2xl border bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{booking.labName}</p>
              <LabBookingStatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {testNames(order, booking.testIds).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
