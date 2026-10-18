"use client";

import { CalendarPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildAppointmentIcs } from "@/features/appointments/lib/calendar";
import type { Appointment } from "@/features/appointments/lib/appointments";

type AddToCalendarButtonProps = {
  appointment: Appointment;
};

// Built in the browser, so no appointment details travel through a URL.
export function AddToCalendarButton({ appointment }: AddToCalendarButtonProps) {
  function download() {
    const blob = new Blob([buildAppointmentIcs(appointment)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "medease-appointment.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={download}
      className="gap-1.5"
    >
      <CalendarPlusIcon aria-hidden />
      Add to calendar
    </Button>
  );
}
