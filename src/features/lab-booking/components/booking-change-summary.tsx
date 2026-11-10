import { CalendarIcon, HouseIcon, PhoneIcon, StoreIcon } from "lucide-react";

import { BookedForBadge } from "@/features/family/components/booked-for-badge";
import {
  formatBookingWhen,
  itemsSummary,
  MAX_RESCHEDULES,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { telHref } from "@/lib/format";

type BookingChangeSummaryProps = {
  booking: LabBooking;
};

// The booking being moved: what, where, and the time it has now.
export function BookingChangeSummary({ booking }: BookingChangeSummaryProps) {
  const home = booking.collection === "home";
  const PlaceIcon = home ? HouseIcon : StoreIcon;
  const left = MAX_RESCHEDULES - booking.rescheduleCount;

  return (
    <aside className="h-fit rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">{booking.labName}</h2>
        <BookedForBadge
          patientName={booking.patientName}
          careRecipientName={booking.careRecipientName}
          careRecipientRelation={booking.careRecipientRelation}
        />
      </div>
      <p className="mt-2 text-sm break-words">{itemsSummary(booking.items)}</p>
      <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" aria-hidden />
          Now: {formatBookingWhen(booking)}
        </li>
        <li className="flex min-w-0 items-start gap-1.5">
          <PlaceIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          <span className="break-words">
            {home && booking.address
              ? `Home collection at ${booking.address.area}, ${booking.address.city}`
              : `Lab visit at ${booking.labAddress}`}
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <PhoneIcon className="size-3.5" aria-hidden />
          <a href={telHref(booking.labPhone)} className="hover:text-foreground">
            {booking.labPhone}
          </a>
        </li>
      </ul>
      <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
        You can move a booking {MAX_RESCHEDULES} times;{" "}
        {left === 1 ? "this is the last" : `${left} moves left`}. To change the
        tests{home ? ", the address" : ""} or how the sample is taken, cancel
        and book again.
      </p>
    </aside>
  );
}
