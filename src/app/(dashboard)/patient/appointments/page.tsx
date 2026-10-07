import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { buttonVariants } from "@/components/ui/button";
import { AppointmentTabs } from "@/features/appointments/components/appointment-tabs";
import {
  pastAppointments,
  upcomingAppointments,
} from "@/features/appointments/data/appointments";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function PatientAppointmentsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Appointments"
        description="Manage upcoming consultations and review past visits."
        actions={
          <Link
            href="/find-doctor"
            className={buttonVariants({ className: "h-9 gap-1.5 px-4" })}
          >
            <PlusIcon aria-hidden />
            Book appointment
          </Link>
        }
      />
      <AppointmentTabs
        upcoming={upcomingAppointments}
        past={pastAppointments}
      />
    </>
  );
}
