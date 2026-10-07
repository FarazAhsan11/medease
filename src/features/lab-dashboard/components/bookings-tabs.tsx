import { ClipboardXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable } from "@/features/lab-dashboard/components/bookings-table";
import {
  bookingStatuses,
  type LabBooking,
} from "@/features/lab-dashboard/data/lab-dashboard";

const ALL = "All";

type BookingsTabsProps = {
  bookings: LabBooking[];
};

export function BookingsTabs({ bookings }: BookingsTabsProps) {
  const tabs = [ALL, ...bookingStatuses];

  return (
    <Tabs defaultValue={ALL} className="gap-4">
      <div className="overflow-x-auto">
        <TabsList className="h-9">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="px-3">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => {
        const filtered =
          tab === ALL
            ? bookings
            : bookings.filter((booking) => booking.status === tab);

        return (
          <TabsContent key={tab} value={tab}>
            {filtered.length > 0 ? (
              <BookingsTable bookings={filtered} />
            ) : (
              <EmptyState
                icon={ClipboardXIcon}
                title="No bookings here"
                description="Bookings move through these stages automatically."
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
