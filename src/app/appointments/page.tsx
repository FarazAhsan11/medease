import type { Metadata } from "next";

import { AppointmentsView } from "@/features/appointments/components/appointments-view";
import { EmptyAppointments } from "@/features/appointments/components/empty-appointments";
import { PastAppointmentCard } from "@/features/appointments/components/past-appointment-card";
import { UpcomingAppointmentCard } from "@/features/appointments/components/upcoming-appointment-card";
import {
  pastAppointments,
  upcomingAppointments,
} from "@/features/appointments/data/appointments";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function AppointmentsPage() {
  return (
    <AppointmentsView
      upcoming={
        upcomingAppointments.length > 0 ? (
          upcomingAppointments.map((appointment) => (
            <UpcomingAppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))
        ) : (
          <EmptyAppointments message="No upcoming appointments found." />
        )
      }
      past={
        pastAppointments.length > 0 ? (
          pastAppointments.map((appointment) => (
            <PastAppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))
        ) : (
          <EmptyAppointments message="No past appointments found." />
        )
      }
    />
  );
}
