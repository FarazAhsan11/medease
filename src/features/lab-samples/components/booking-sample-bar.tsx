import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { labRoutes } from "@/config/routes";
import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import { PrintLabelsButton } from "@/features/lab-samples/components/print-labels-button";
import { SampleCodes } from "@/features/lab-samples/components/sample-codes";
import { isPrintable } from "@/features/lab-samples/lib/samples";
import {
  labRoleCan,
  type LabMemberRole,
} from "@/features/lab-staff/lib/lab-permissions";

type BookingSampleBarProps = {
  booking: LabBooking;
  role: LabMemberRole;
  // Off on the booking's own page.
  detailsLink?: boolean;
};

// Under a lab booking: its sample codes, labels to print, and a link to the
// booking's page with who did each step.
export function BookingSampleBar({
  booking,
  role,
  detailsLink = true,
}: BookingSampleBarProps) {
  const prints =
    isPrintable(booking.status) && labRoleCan(role, "bookings.collect");
  if (!prints && !detailsLink && booking.samples.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {booking.samples.length > 0 && <SampleCodes samples={booking.samples} />}
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {prints && <PrintLabelsButton bookingId={booking.id} />}
        {detailsLink && (
          <Link
            href={labRoutes.booking(booking.id)}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Details and history
          </Link>
        )}
      </div>
    </div>
  );
}
