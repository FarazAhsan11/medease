import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { doctorRoutes } from "@/config/routes";
import { getAppointment } from "@/features/appointments/data/appointments";
import { PrescriptionWorkspace } from "@/features/prescriptions/components/prescription-workspace";
import { listAppointmentPrescriptions } from "@/features/prescriptions/data/prescriptions";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Prescription",
};

export default async function DoctorPrescriptionPage({
  params,
}: PageProps<"/doctor/appointments/[appointmentId]/prescription">) {
  const user = await requireRole("doctor");
  const { appointmentId } = await params;

  const appointment = await getAppointment(appointmentId);
  if (!appointment || appointment.doctorId !== user.id) notFound();
  const prescriptions = await listAppointmentPrescriptions(appointment.id);

  return (
    <>
      <div className="grid gap-4 print:hidden">
        <BackLink href={doctorRoutes.appointments}>
          Back to appointments
        </BackLink>
        <DashboardPageHeader
          title="Prescription"
          description="Medicines, dosing and advice for this visit. The patient sees it as soon as you issue it."
        />
      </div>
      <PrescriptionWorkspace
        appointment={appointment}
        prescriptions={prescriptions}
      />
    </>
  );
}
