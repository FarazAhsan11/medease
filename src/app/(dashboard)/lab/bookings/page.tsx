import { ClipboardListIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { labRoutes } from "@/config/routes";
import { LabBookingEntry } from "@/features/lab-booking/components/lab-booking-entry";
import { LabBookingsViewLinks } from "@/features/lab-booking/components/lab-bookings-view-links";
import {
  getLabBookings,
  LAB_BOOKINGS_SHOWN,
} from "@/features/lab-booking/data/lab-bookings";
import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import { formatDate } from "@/lib/datetime";
import { searchParam } from "@/lib/directory-search";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Bookings",
};

// Bookings in order, under a heading per day.
function byDay(bookings: LabBooking[]) {
  const days = new Map<string, LabBooking[]>();
  for (const booking of bookings) {
    const day = days.get(booking.visitDate);
    if (day) day.push(booking);
    else days.set(booking.visitDate, [booking]);
  }
  return [...days.entries()];
}

export default async function LabBookingsPage({
  searchParams,
}: PageProps<"/lab/bookings">) {
  const view =
    searchParam((await searchParams).view) === "past" ? "past" : "upcoming";
  const user = await requireRole("lab");
  const { bookings, more } = await getLabBookings(user.id, view);

  return (
    <>
      <DashboardPageHeader
        title="Bookings"
        description="Lab visits and home collections booked on MedEase. Payment is in cash for now."
      />
      <LabBookingsViewLinks basePath={labRoutes.bookings} active={view} />
      {bookings.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={
            view === "upcoming"
              ? "No bookings coming up"
              : "No earlier bookings"
          }
          description="Patients book your listed tests from the lab tests pages. New bookings also show in your notifications."
        />
      ) : (
        <div className="space-y-6">
          {byDay(bookings).map(([day, entries]) => (
            <section key={day} className="space-y-3">
              <h2 className="text-sm font-semibold">
                {formatDate(`${day}T12:00:00Z`, "UTC")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({entries.length})
                </span>
              </h2>
              {entries.map((booking) => (
                <LabBookingEntry key={booking.id} booking={booking} />
              ))}
            </section>
          ))}
          {more && (
            <p className="text-center text-xs text-muted-foreground">
              Showing the first {LAB_BOOKINGS_SHOWN} bookings.
            </p>
          )}
        </div>
      )}
    </>
  );
}
