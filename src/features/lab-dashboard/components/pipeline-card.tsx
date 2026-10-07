import { PanelCard } from "@/components/shared/panel-card";
import { Progress } from "@/components/ui/progress";
import {
  bookingStatuses,
  type LabBooking,
} from "@/features/lab-dashboard/data/lab-dashboard";

type PipelineCardProps = {
  bookings: LabBooking[];
};

export function PipelineCard({ bookings }: PipelineCardProps) {
  return (
    <PanelCard title="Today's pipeline" description="Bookings by stage">
      <ul className="grid gap-4 p-5">
        {bookingStatuses.map((status) => {
          const count = bookings.filter(
            (booking) => booking.status === status,
          ).length;

          return (
            <li key={status} className="grid gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{status}</span>
                <span className="font-medium">{count}</span>
              </div>
              <Progress
                value={(count / bookings.length) * 100}
                aria-label={`${status}: ${count} bookings`}
              />
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
