import { CalendarClockIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { CancelLabBookingDialog } from "@/features/lab-booking/components/cancel-lab-booking-dialog";
import {
  canPatientChange,
  canReschedule,
  itemsSummary,
  MAX_RESCHEDULES,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";

type PatientLabBookingActionsProps = {
  booking: LabBooking;
};

// Until the sample is taken, the patient can move the booking or cancel it
// (LAB-20). The database checks both.
export function PatientLabBookingActions({
  booking,
}: PatientLabBookingActionsProps) {
  if (!canPatientChange(booking)) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {canReschedule(booking) ? (
        <Link
          href={patientRoutes.rescheduleLabBooking(booking.id)}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1.5",
          })}
        >
          <CalendarClockIcon aria-hidden />
          Change time
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground">
          Moved {MAX_RESCHEDULES} times already. To change it again, call the
          lab.
        </p>
      )}
      <CancelLabBookingDialog
        bookingId={booking.id}
        summary={`${booking.labName} · ${itemsSummary(booking.items)}`}
      />
    </div>
  );
}
