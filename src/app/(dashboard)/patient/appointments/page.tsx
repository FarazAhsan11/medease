import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { AppointmentTabs } from "@/features/appointments/components/appointment-tabs";
import { listPatientAppointments } from "@/features/appointments/data/appointments";
import { groupAppointments } from "@/features/appointments/lib/appointments";
import { listPatientPrescriptions } from "@/features/prescriptions/data/prescriptions";
import { prescriptionIdsByAppointment } from "@/features/prescriptions/lib/prescriptions";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Appointments",
};

export default async function PatientAppointmentsPage() {
  const user = await requireRole("patient");
  const [appointments, prescriptions] = await Promise.all([
    listPatientAppointments(user.id),
    listPatientPrescriptions(user.id),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Appointments"
        description="Manage upcoming consultations and review past visits."
        actions={
          <Link
            href={patientRoutes.findDoctor}
            className={buttonVariants({ className: "h-9 gap-1.5 px-4" })}
          >
            <PlusIcon aria-hidden />
            Book appointment
          </Link>
        }
      />
      <AppointmentTabs
        {...groupAppointments(appointments)}
        prescriptionIds={prescriptionIdsByAppointment(prescriptions)}
      />
    </>
  );
}
