import { CalendarXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisitsTable } from "@/features/doctor-dashboard/components/visits-table";
import {
  scheduleStatuses,
  type ScheduledVisit,
} from "@/features/doctor-dashboard/data/schedule";

type VisitsTabsProps = {
  visits: ScheduledVisit[];
};

export function VisitsTabs({ visits }: VisitsTabsProps) {
  return (
    <Tabs defaultValue="Upcoming" className="gap-4">
      <TabsList className="h-9">
        {scheduleStatuses.map((status) => (
          <TabsTrigger key={status} value={status} className="px-3">
            {status}
          </TabsTrigger>
        ))}
      </TabsList>
      {scheduleStatuses.map((status) => {
        const filtered = visits.filter((visit) => visit.status === status);

        return (
          <TabsContent key={status} value={status}>
            {filtered.length > 0 ? (
              <VisitsTable visits={filtered} />
            ) : (
              <EmptyState
                icon={CalendarXIcon}
                title={`No ${status.toLowerCase()} appointments`}
                description="Appointments will appear here as patients book."
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
