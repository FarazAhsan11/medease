import { FlaskConicalIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { LabBookingCard } from "@/features/lab-booking/components/lab-booking-card";
import {
  getPatientLabBookings,
  PATIENT_BOOKINGS_SHOWN,
} from "@/features/lab-booking/data/lab-bookings";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Lab tests",
};

export default async function PatientLabTestsPage() {
  const user = await requireRole("patient");
  const bookings = await getPatientLabBookings(
    user.id,
    PATIENT_BOOKINGS_SHOWN,
    true,
  );

  return (
    <>
      <DashboardPageHeader
        title="Lab tests"
        description="Your lab bookings and how far along each one is. To cancel or change one, call the lab."
        actions={
          <Link
            href={patientRoutes.bookLabTests}
            className={buttonVariants({ className: "h-9 gap-1.5 px-4" })}
          >
            <PlusIcon aria-hidden />
            Book a test
          </Link>
        }
      />
      {bookings.length === 0 ? (
        <EmptyState
          icon={FlaskConicalIcon}
          title="No lab bookings yet"
          description="Compare prices across verified labs, then book a lab visit or home collection."
          action={
            <Link
              href={patientRoutes.bookLabTests}
              className={buttonVariants()}
            >
              Find a lab test
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <LabBookingCard key={booking.id} booking={booking} />
          ))}
          {bookings.length === PATIENT_BOOKINGS_SHOWN && (
            <p className="text-center text-xs text-muted-foreground">
              Showing your latest {PATIENT_BOOKINGS_SHOWN} bookings.
            </p>
          )}
        </div>
      )}
    </>
  );
}
