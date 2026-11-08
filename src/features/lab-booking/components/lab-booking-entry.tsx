import { HouseIcon, PhoneIcon, StoreIcon } from "lucide-react";

import { LabBookingStatusBadge } from "@/features/lab-booking/components/lab-booking-status-badge";
import { bookedByLabel } from "@/features/family/lib/relations";
import {
  ageOn,
  paymentLabels,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { formatTime } from "@/lib/datetime";
import { formatFee, telHref } from "@/lib/format";

type LabBookingEntryProps = {
  booking: LabBooking;
};

// One booking in the lab's list: who, what, where and what to collect.
export function LabBookingEntry({ booking }: LabBookingEntryProps) {
  const home = booking.collection === "home" && booking.address;
  const age = booking.careRecipientDateOfBirth
    ? ageOn(booking.careRecipientDateOfBirth, booking.visitDate)
    : null;
  const details = [
    age === null ? null : `${age} ${age === 1 ? "year" : "years"}`,
    booking.careRecipientGender,
  ].filter(Boolean);
  const bookedBy = bookedByLabel(booking);
  const phone = home ? booking.address?.contactPhone : booking.patientPhone;

  return (
    <article className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
      <div className="min-w-0">
        <p className="text-sm font-semibold break-words">
          {booking.careRecipientName}
        </p>
        <p className="text-xs text-muted-foreground">
          {[...details, bookedBy].filter(Boolean).join(" · ") || " "}
        </p>
        {phone && (
          <a
            href={telHref(phone)}
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <PhoneIcon className="size-3.5" aria-hidden />
            {phone}
          </a>
        )}
      </div>

      <div className="min-w-0 text-sm">
        <ul className="grid gap-0.5">
          {booking.items.map((item) => (
            <li key={item.id} className="break-words">
              {item.name}
              {item.isPackage && (
                <span className="block text-xs text-muted-foreground">
                  {item.testNames.join(", ")}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          {home ? (
            <HouseIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          ) : (
            <StoreIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          )}
          <span className="break-words">
            {home && booking.address && booking.slotStartsAt
              ? `Home collection, ${formatTime(booking.slotStartsAt, booking.timezone)}${booking.slotEndsAt ? ` – ${formatTime(booking.slotEndsAt, booking.timezone)}` : ""}: ${booking.address.streetAddress}, ${booking.address.area}, ${booking.address.city}${booking.address.landmark ? ` (near ${booking.address.landmark})` : ""}`
              : "Lab visit"}
          </span>
        </p>
      </div>

      <div className="flex items-start justify-between gap-3 md:flex-col md:items-end">
        <LabBookingStatusBadge status={booking.status} />
        <p className="text-sm font-semibold">
          {formatFee(booking.total)}
          <span className="block text-right text-xs font-normal text-muted-foreground">
            {paymentLabels[booking.paymentMethod]},{" "}
            {paymentLabels[booking.paymentStatus]}
          </span>
        </p>
      </div>
    </article>
  );
}
