import { BanknoteIcon, ClockIcon, TestTubeIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { bookedByLabel } from "@/features/family/lib/relations";
import { LabBookingStatusBadge } from "@/features/lab-booking/components/lab-booking-status-badge";
import { LabBookingStatusReason } from "@/features/lab-booking/components/lab-booking-status-reason";
import {
  ageOn,
  itemsSummary,
  type LabBookingStatus,
} from "@/features/lab-booking/lib/lab-bookings";
import { CollectVisitDialog } from "@/features/lab-collections/components/collect-visit-dialog";
import { CollectionAddress } from "@/features/lab-collections/components/collection-address";
import { RecordCashButton } from "@/features/lab-collections/components/record-cash-button";
import {
  containersLabel,
  takesCash,
  type CollectionVisit,
} from "@/features/lab-collections/lib/collections";
import { BookingSampleBar } from "@/features/lab-samples/components/booking-sample-bar";
import type { LabMemberRole } from "@/features/lab-staff/lib/lab-permissions";
import { formatDateKey, formatTime, toDateKey } from "@/lib/datetime";
import { formatFee } from "@/lib/format";
import { cn } from "@/lib/utils";

type CollectionVisitCardProps = {
  visit: CollectionVisit;
  role: LabMemberRole;
  // Earlier days' visits show their date.
  showDate?: boolean;
};

const toCollect: LabBookingStatus[] = ["booked", "recollection_needed"];

// One home visit on the collector's phone: when, who, where, what to bring,
// what to take, and the step to mark.
export function CollectionVisitCard({
  visit: { booking, sampleTypes },
  role,
  showDate = false,
}: CollectionVisitCardProps) {
  const open = toCollect.includes(booking.status);
  const cashDue = takesCash(booking) ? booking.total : null;
  const age = booking.careRecipientDateOfBirth
    ? ageOn(booking.careRecipientDateOfBirth, booking.visitDate)
    : null;
  const details = [
    age === null ? null : `${age} ${age === 1 ? "year" : "years"}`,
    booking.careRecipientGender,
    bookedByLabel(booking),
  ].filter(Boolean);
  const summary = `${booking.careRecipientName} · ${itemsSummary(booking.items)}`;
  const reached =
    toDateKey(new Date(), booking.timezone) >= booking.visitDate;

  return (
    <article
      className={cn(
        "grid gap-4 rounded-2xl border bg-card p-4 sm:p-5",
        !open && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <ClockIcon className="size-4 text-muted-foreground" aria-hidden />
          {showDate && `${formatDateKey(booking.visitDate)}, `}
          {booking.slotStartsAt &&
            formatTime(booking.slotStartsAt, booking.timezone)}
          {booking.slotEndsAt &&
            ` – ${formatTime(booking.slotEndsAt, booking.timezone)}`}
        </p>
        <LabBookingStatusBadge status={booking.status} />
      </div>

      <div>
        <h3 className="text-base font-semibold break-words">
          {booking.careRecipientName}
        </h3>
        {details.length > 0 && (
          <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
        )}
      </div>

      {booking.address && <CollectionAddress address={booking.address} />}

      <div className="grid gap-2 text-sm">
        <p className="break-words">
          {booking.items.map((item) => item.name).join(", ")}
        </p>
        {sampleTypes.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TestTubeIcon className="size-3.5" aria-hidden />
            Bring: {containersLabel(sampleTypes)}
          </p>
        )}
        {booking.labOrderId && (
          <StatusBadge tone="info" className="w-fit">
            Doctor&apos;s order
          </StatusBadge>
        )}
      </div>

      <p
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
          cashDue !== null
            ? "bg-warning-soft text-warning"
            : booking.paymentStatus === "paid"
              ? "bg-success-soft text-success"
              : "bg-muted text-muted-foreground",
        )}
      >
        <BanknoteIcon className="size-4 shrink-0" aria-hidden />
        {paymentLine(booking, cashDue)}
      </p>

      <LabBookingStatusReason booking={booking} audience="lab" />

      {open && reached && (
        <CollectVisitDialog
          bookingId={booking.id}
          fromStatus={booking.status as "booked" | "recollection_needed"}
          summary={summary}
          cashDue={cashDue}
        />
      )}
      {!open && cashDue !== null && (
        <div>
          <RecordCashButton
            bookingId={booking.id}
            amount={cashDue}
            summary={summary}
          />
        </div>
      )}
      <BookingSampleBar booking={booking} role={role} />
    </article>
  );
}

// What the collector takes, or why there's nothing to take.
function paymentLine(booking: CollectionVisit["booking"], cashDue: number | null) {
  if (cashDue !== null) return `Collect ${formatFee(cashDue)} in cash`;
  if (booking.paymentStatus === "paid")
    return booking.paymentMethod === "cash"
      ? `${formatFee(booking.total)} paid in cash`
      : "Paid online, nothing to collect";
  if (booking.status === "cancelled") return "Cancelled, nothing to collect";
  return "Nothing to collect";
}
