import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { StarRating } from "@/features/appointments/components/star-rating";
import type { Appointment } from "@/features/appointments/data/appointments";

type PastAppointmentCardProps = {
  appointment: Appointment;
};

export function PastAppointmentCard({ appointment }: PastAppointmentCardProps) {
  return (
    <AppointmentCard
      appointment={appointment}
      status={<Badge variant="secondary">Completed</Badge>}
      actions={
        <>
          {appointment.rating && (
            <div className="flex items-center gap-2 rounded-lg border px-3 text-xs text-muted-foreground">
              Your rating
              <StarRating value={appointment.rating} />
            </div>
          )}
          <Button variant="outline" size="sm">
            View details
          </Button>
        </>
      }
    />
  );
}
