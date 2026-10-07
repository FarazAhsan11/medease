import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { BookingsTabs } from "@/features/lab-dashboard/components/bookings-tabs";
import { labBookings } from "@/features/lab-dashboard/data/lab-dashboard";

export const metadata: Metadata = {
  title: "Bookings",
};

export default function LabBookingsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Bookings"
        description="Move each booking from collection to report delivery."
        actions={
          <Button variant="outline" className="h-9 gap-1.5 px-4">
            <DownloadIcon aria-hidden />
            Export
          </Button>
        }
      />
      <BookingsTabs bookings={labBookings} />
    </>
  );
}
