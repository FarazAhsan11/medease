import { CalendarXIcon, HistoryIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/features/appointments/components/count-badge";
import { PastAppointmentCard } from "@/features/appointments/components/past-appointment-card";
import { UpcomingAppointmentCard } from "@/features/appointments/components/upcoming-appointment-card";
import type { Appointment } from "@/features/appointments/data/appointments";

type AppointmentTabsProps = {
  upcoming: Appointment[];
  past: Appointment[];
};

export function AppointmentTabs({ upcoming, past }: AppointmentTabsProps) {
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
      </TabsList>

      <TabsContent value="upcoming" className="grid gap-3">
        {upcoming.length > 0 ? (
          upcoming.map((appointment) => (
            <UpcomingAppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))
        ) : (
          <EmptyState
            icon={CalendarXIcon}
            title="No upcoming appointments"
            description="When you book a consultation it will show up here."
            action={
              <Link href="/find-doctor" className={buttonVariants()}>
                Find a doctor
              </Link>
            }
          />
        )}
      </TabsContent>

      <TabsContent value="past" className="grid gap-3">
        {past.length > 0 ? (
          past.map((appointment) => (
            <PastAppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))
        ) : (
          <EmptyState
            icon={HistoryIcon}
            title="No past appointments"
            description="Your completed consultations will appear here."
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
