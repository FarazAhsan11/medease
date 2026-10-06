import { CalendarPlusIcon, VideoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import type { Appointment } from "@/features/appointments/data/appointments";

type UpcomingAppointmentCardProps = {
  appointment: Appointment;
};

export function UpcomingAppointmentCard({
  appointment,
}: UpcomingAppointmentCardProps) {
  return (
    <AppointmentCard
      appointment={appointment}
      status={<Badge className="bg-success-soft text-success">Confirmed</Badge>}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarPlusIcon aria-hidden />
            Add to calendar
          </Button>
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} />}>
              <Button size="sm" disabled className="gap-1.5">
                <VideoIcon aria-hidden />
                Join call
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Available 5 minutes before the appointment
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel
          </Button>
        </>
      }
    />
  );
}
