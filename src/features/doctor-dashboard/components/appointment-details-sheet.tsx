"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { AppointmentDetails } from "@/features/doctor-dashboard/components/appointment-details";
import type { PrescriptionSummary } from "@/features/prescriptions/lib/prescriptions";
import { formatDateTime } from "@/lib/datetime";

type AppointmentDetailsSheetProps = {
  appointment: Appointment;
  notes: string;
  previousVisits: number;
  prescription: PrescriptionSummary | null;
};

export function AppointmentDetailsSheet(props: AppointmentDetailsSheetProps) {
  const { appointment } = props;

  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        Details
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Appointment details</SheetTitle>
          <SheetDescription>
            {formatDateTime(appointment.startsAt, appointment.timezone)}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <AppointmentDetails {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
