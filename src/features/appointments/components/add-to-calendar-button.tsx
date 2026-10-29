"use client";

import { CalendarPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildAppointmentIcs,
  type CalendarAppointment,
} from "@/features/appointments/lib/calendar";

type AddToCalendarButtonProps = {
  appointment: CalendarAppointment;
  // Page the calendar event links back to for the details.
  href: string;
};

// Built in the browser, so no appointment details travel through a URL.
export function AddToCalendarButton({
  appointment,
  href,
}: AddToCalendarButtonProps) {
  function download() {
    const link = new URL(href, window.location.origin).toString();
    const blob = new Blob([buildAppointmentIcs(appointment, link)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "medease-appointment.ics";
    anchor.click();
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
