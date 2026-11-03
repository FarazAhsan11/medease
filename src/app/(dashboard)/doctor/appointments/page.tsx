import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import {
  getAppointmentNotes,
  listDoctorAppointments,
} from "@/features/appointments/data/appointments";
import { VisitsTabs } from "@/features/doctor-dashboard/components/visits-tabs";
import { getDoctorPrescriptionSummaries } from "@/features/prescriptions/data/prescriptions";
import { getVisitSummaries } from "@/features/visit-summaries/data/visit-summaries";
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
  const ids = appointments.map((item) => item.id);
  const [notes, summaries] = await Promise.all([
    getAppointmentNotes(ids),
    getVisitSummaries(ids),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Appointments"
        description="Everything booked with you. Open an appointment for patient details, notes, visit summaries, prescriptions and actions."
      />
      <VisitsTabs
        appointments={appointments}
        notes={notes}
        prescriptions={prescriptions}
        summaries={summaries}
      />
    </>
  );
}
