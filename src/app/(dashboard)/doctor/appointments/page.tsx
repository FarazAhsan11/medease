import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import {
  getAppointmentNotes,
  listDoctorAppointments,
} from "@/features/appointments/data/appointments";
import { VisitsTabs } from "@/features/doctor-dashboard/components/visits-tabs";
import { getDoctorPrescriptionSummaries } from "@/features/prescriptions/data/prescriptions";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Appointments",
};

export default async function DoctorAppointmentsPage() {
  const user = await requireRole("doctor");
  const [appointments, prescriptions] = await Promise.all([
    listDoctorAppointments(user.id),
    getDoctorPrescriptionSummaries(user.id),
  ]);
  const notes = await getAppointmentNotes(appointments.map((item) => item.id));

  return (
    <>
      <DashboardPageHeader
        title="Appointments"
        description="Everything booked with you. Open an appointment for patient details, notes, prescriptions and actions."
      />
      <VisitsTabs
        appointments={appointments}
        notes={notes}
        prescriptions={prescriptions}
      />
    </>
  );
}
