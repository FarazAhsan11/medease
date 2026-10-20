import { CalendarXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/features/appointments/components/count-badge";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { VisitsTable } from "@/features/doctor-dashboard/components/visits-table";
import {
  countPreviousVisits,
  groupDoctorAppointments,
} from "@/features/doctor-dashboard/lib/practice";
import type { PrescriptionSummary } from "@/features/prescriptions/lib/prescriptions";

type VisitsTabsProps = {
  appointments: Appointment[];
  notes: Record<string, string>;
  prescriptions: Record<string, PrescriptionSummary>;
};

const tabs = [
  {
    value: "upcoming",
    label: "Upcoming",
    empty: "No upcoming appointments. New bookings will appear here.",
  },
  {
    value: "needsOutcome",
    label: "Needs outcome",
    empty:
      "You're all caught up. Past appointments you haven't marked appear here.",
  },
  {
    value: "past",
    label: "Past",
    empty: "Completed and no-show appointments will appear here.",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    empty: "Appointments cancelled by you or your patients appear here.",
  },
] as const;

export function VisitsTabs({
  appointments,
  notes,
  prescriptions,
}: VisitsTabsProps) {
  const groups = groupDoctorAppointments(appointments);
  const previousVisits = countPreviousVisits(appointments);

  return (
    <Tabs defaultValue="upcoming" className="gap-4">
      <TabsList className="h-9 w-full justify-start overflow-x-auto sm:w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-2 px-3">
            {tab.label}
            <CountBadge count={groups[tab.value].length} />
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {groups[tab.value].length > 0 ? (
            <VisitsTable
              visits={groups[tab.value]}
              notes={notes}
              previousVisits={previousVisits}
              prescriptions={prescriptions}
            />
          ) : (
            <EmptyState
              icon={CalendarXIcon}
              title={`No ${tab.label.toLowerCase()} appointments`}
              description={tab.empty}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
