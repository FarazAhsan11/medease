import { CalendarIcon, HouseIcon, PhoneIcon, StoreIcon } from "lucide-react";

import { patientRoutes } from "@/config/routes";
import { BookedForBadge } from "@/features/family/components/booked-for-badge";
import { LabBookingStatusBadge } from "@/features/lab-booking/components/lab-booking-status-badge";
import { LabBookingStatusReason } from "@/features/lab-booking/components/lab-booking-status-reason";
import { OrderTracker } from "@/features/lab-booking/components/order-tracker";
import { PatientLabBookingActions } from "@/features/lab-booking/components/patient-lab-booking-actions";
import {
  formatBookingWhen,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { LabReportLink } from "@/features/lab-reports/components/lab-report-link";
import { formatFee, telHref } from "@/lib/format";

type LabBookingCardProps = {
  booking: LabBooking;
};

// One of the patient's lab bookings, with its progress.
export function LabBookingCard({ booking }: LabBookingCardProps) {
  const home = booking.collection === "home";
  const PlaceIcon = home ? HouseIcon : StoreIcon;

  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">{booking.labName}</h2>
        <LabBookingStatusBadge status={booking.status} />
        <BookedForBadge
          patientName={booking.patientName}
          careRecipientName={booking.careRecipientName}
          careRecipientRelation={booking.careRecipientRelation}
        />
      </div>

      <ul className="mt-3 grid gap-1 text-sm">
        {booking.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">
              {item.name}
              {item.isPackage && (
                <span className="block text-xs text-muted-foreground">
                  {item.testNames.join(", ")}
                </span>
              )}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatFee(item.price)}
            </span>
          </li>
        ))}
      </ul>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" aria-hidden />
          {formatBookingWhen(booking)}
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
        <li className="font-medium text-foreground">
          {formatFee(booking.total)}
          {booking.collectionFee > 0 &&
            ` incl. ${formatFee(booking.collectionFee)} collection`}
          <span className="font-normal text-muted-foreground">
            {" "}
            · pay in cash
          </span>
        </li>
      </ul>

      {booking.statusReason && (
        <div className="mt-4">
          <LabBookingStatusReason booking={booking} audience="patient" />
        </div>
      )}

      <PatientLabBookingActions booking={booking} />

      {booking.status !== "cancelled" && (
        <div className="mt-5 border-t pt-5">
          <OrderTracker
            status={booking.status}
            steps={{ booked: booking.createdAt, ...booking.steps }}
            timezone={booking.timezone}
          />
          {booking.status === "report_ready" &&
            (booking.reportId ? (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <LabReportLink
                  href={patientRoutes.labReport(booking.reportId)}
                />
                <p className="text-xs text-muted-foreground">
                  Also in your health records.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Collect your report from the lab or ask them how they&apos;ll
                send it.
              </p>
            ))}
        </div>
      )}
    </article>
  );
}
