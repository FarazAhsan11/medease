import { CalendarXIcon, HistoryIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patientRoutes } from "@/config/routes";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { CountBadge } from "@/features/appointments/components/count-badge";
import { UpcomingAppointmentCard } from "@/features/appointments/components/upcoming-appointment-card";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { ViewPrescriptionLink } from "@/features/prescriptions/components/view-prescription-link";

type AppointmentTabsProps = {
  upcoming: Appointment[];
  past: Appointment[];
  cancelled: Appointment[];
  // Appointment id -> prescription id, for appointments that have one.
  prescriptionIds: Record<string, string>;
};

function BookAgainLink({ doctorId }: { doctorId: string }) {
  return (
    <Link
      href={patientRoutes.bookDoctor(doctorId)}
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className: "gap-1.5",
      })}
    >
      <RotateCcwIcon aria-hidden />
      Book again
    </Link>
  );
}

function HistoryList({
  appointments,
  prescriptionIds,
}: {
  appointments: Appointment[];
  prescriptionIds: Record<string, string>;
}) {
  return appointments.map((appointment) => {
    const prescriptionId = prescriptionIds[appointment.id];

    return (
      <AppointmentCard
        key={appointment.id}
        appointment={appointment}
        status={
          <AppointmentStatusBadge appointment={appointment} viewer="patient" />
        }
        actions={
          <>
            {prescriptionId && (
              <ViewPrescriptionLink
                href={patientRoutes.prescription(prescriptionId)}
              />
            )}
            <BookAgainLink doctorId={appointment.doctorId} />
          </>
        }
      />
    );
  });
}

export function AppointmentTabs({
  upcoming,
  past,
  cancelled,
  prescriptionIds,
}: AppointmentTabsProps) {
  return (
    <Tabs defaultValue="upcoming" className="gap-6">
      <TabsList className="h-9">
        <TabsTrigger value="upcoming" className="gap-2 px-3">
          Upcoming
          <CountBadge count={upcoming.length} />
        </TabsTrigger>
        <TabsTrigger value="past" className="gap-2 px-3">
          Past
          <CountBadge count={past.length} />
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="gap-2 px-3">
          Cancelled
          <CountBadge count={cancelled.length} />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="grid gap-3">
        {upcoming.length > 0 ? (
          upcoming.map((appointment) => (
            <UpcomingAppointmentCard
              key={appointment.id}
              appointment={appointment}
              prescriptionId={prescriptionIds[appointment.id]}
            />
          ))
        ) : (
          <EmptyState
            icon={CalendarXIcon}
            title="No upcoming appointments"
            description="When you book a consultation it will show up here."
            action={
              <Link
                href={patientRoutes.findDoctor}
                className={buttonVariants()}
              >
                Find a doctor
              </Link>
            }
          />
        )}
      </TabsContent>

      <TabsContent value="past" className="grid gap-3">
        {past.length > 0 ? (
          <HistoryList appointments={past} prescriptionIds={prescriptionIds} />
        ) : (
          <EmptyState
            icon={HistoryIcon}
            title="No past appointments"
            description="Your completed consultations will appear here."
          />
        )}
      </TabsContent>

      <TabsContent value="cancelled" className="grid gap-3">
        {cancelled.length > 0 ? (
          <HistoryList
            appointments={cancelled}
            prescriptionIds={prescriptionIds}
          />
        ) : (
          <EmptyState
            icon={CalendarXIcon}
            title="No cancelled appointments"
            description="Appointments you or your doctor cancel will appear here."
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
