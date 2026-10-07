import { HouseIcon, StoreIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LabBooking } from "@/features/lab-dashboard/data/lab-dashboard";
import { bookingTones } from "@/features/lab-dashboard/lib/booking-tones";

const nextAction: Record<LabBooking["status"], string> = {
  Pending: "Mark collected",
  "Sample collected": "Start processing",
  Processing: "Upload report",
  Completed: "View report",
};

type BookingsTableProps = {
  bookings: LabBooking[];
};

export function BookingsTable({ bookings }: BookingsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Booking</TableHead>
            <TableHead>Tests</TableHead>
            <TableHead className="hidden md:table-cell">Collection</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const CollectionIcon =
              booking.collection === "Home" ? HouseIcon : StoreIcon;

            return (
              <TableRow key={booking.id}>
                <TableCell className="pl-5">
                  <p className="font-medium">{booking.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.id} · {booking.slot}
                  </p>
                </TableCell>
                <TableCell className="max-w-48 whitespace-normal">
                  {booking.tests.join(", ")}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CollectionIcon className="size-3.5" aria-hidden />
                    {booking.collection} · {booking.area}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={bookingTones[booking.status]} dot>
                    {booking.status}
                  </StatusBadge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button
                    size="sm"
                    variant={
                      booking.status === "Completed" ? "ghost" : "outline"
                    }
                  >
                    {nextAction[booking.status]}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
