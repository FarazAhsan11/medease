import { MapPinIcon } from "lucide-react";

import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { LabBooking } from "@/features/lab-dashboard/data/lab-dashboard";
import { bookingTones } from "@/features/lab-dashboard/lib/booking-tones";

type HomeCollectionsCardProps = {
  bookings: LabBooking[];
};

export function HomeCollectionsCard({ bookings }: HomeCollectionsCardProps) {
  const collections = bookings.filter(
    (booking) => booking.collection === "Home",
  );

  return (
    <PanelCard
      title="Today's home collections"
      description={`${collections.length} visits scheduled`}
      action={<PanelLink href="/lab/bookings">All bookings</PanelLink>}
    >
      <ol className="divide-y">
        {collections.map((booking) => (
          <li
            key={booking.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
          >
            <div className="w-16 shrink-0 text-sm font-semibold">
              {booking.slot}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{booking.patientName}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPinIcon className="size-3" aria-hidden />
                {booking.area} · {booking.tests.join(", ")}
              </p>
            </div>
            {booking.status === "Pending" ? (
              <Button size="sm" variant="outline">
                Mark collected
              </Button>
            ) : (
              <StatusBadge tone={bookingTones[booking.status]}>
                {booking.status}
              </StatusBadge>
            )}
          </li>
        ))}
      </ol>
    </PanelCard>
  );
}
