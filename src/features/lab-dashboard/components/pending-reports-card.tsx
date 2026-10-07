import { UploadIcon } from "lucide-react";

import { PanelCard } from "@/components/shared/panel-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type { LabBooking } from "@/features/lab-dashboard/data/lab-dashboard";

type PendingReportsCardProps = {
  bookings: LabBooking[];
};

export function PendingReportsCard({ bookings }: PendingReportsCardProps) {
  const pending = bookings.filter((booking) => booking.status === "Processing");

  return (
    <PanelCard
      title="Awaiting results"
      description={`${pending.length} reports to upload`}
    >
      <ul className="divide-y">
        {pending.map((booking) => {
          const inputId = `report-${booking.id}`;

          return (
            <li
              key={booking.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
            >
              <UserAvatar name={booking.patientName} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{booking.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {booking.id} · {booking.tests.join(", ")}
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                render={<label htmlFor={inputId} />}
                nativeButton={false}
              >
                <UploadIcon aria-hidden />
                Upload report
              </Button>
              <input
                id={inputId}
                type="file"
                accept="application/pdf"
                className="sr-only"
              />
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
