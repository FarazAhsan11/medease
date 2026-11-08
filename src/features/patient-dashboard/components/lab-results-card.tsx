import { FlaskConicalIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { patientRoutes } from "@/config/routes";
import { LabBookingStatusBadge } from "@/features/lab-booking/components/lab-booking-status-badge";
import {
  formatBookingWhen,
  itemsSummary,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";

type LabResultsCardProps = {
  bookings: LabBooking[];
};

// The patient's latest lab bookings on their overview.
export function LabResultsCard({ bookings }: LabResultsCardProps) {
  return (
    <PanelCard
      title="Lab tests"
      action={<PanelLink href={patientRoutes.labTests}>View all</PanelLink>}
    >
      {bookings.length > 0 ? (
        <ul className="divide-y">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex items-center gap-3 px-5 py-4">
              <IconTile
                icon={FlaskConicalIcon}
                size="sm"
                tone={booking.status === "report_ready" ? "success" : "muted"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {itemsSummary(booking.items)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {booking.labName} · {formatBookingWhen(booking)}
                </p>
              </div>
              <LabBookingStatusBadge status={booking.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No lab tests yet. Book one to follow it here.
        </p>
      )}
    </PanelCard>
  );
}
