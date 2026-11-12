import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { doctorRoutes } from "@/config/routes";
import { getAppointment } from "@/features/appointments/data/appointments";
import { getLabTestTypes } from "@/features/lab-catalog/data/lab-catalog";
import { DoctorLabOrderPanel } from "@/features/lab-orders/components/doctor-lab-order-panel";
import { getLabOrderForAppointment } from "@/features/lab-orders/data/lab-orders";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Lab tests",
};

export default async function DoctorLabOrderPage({
  params,
}: PageProps<"/doctor/appointments/[appointmentId]/lab-tests">) {
  const user = await requireRole("doctor");
  const { appointmentId } = await params;

  const appointment = await getAppointment(appointmentId);
  if (!appointment || appointment.doctorId !== user.id) notFound();
  const [order, testTypes] = await Promise.all([
    getLabOrderForAppointment(appointment.id),
    getLabTestTypes(),
  ]);

  return (
    <>
      <div className="grid gap-4">
        <BackLink href={doctorRoutes.appointments}>
          Back to appointments
        </BackLink>
        <DashboardPageHeader
          title="Lab tests"
          description="Tests for this visit. The patient sees them as soon as you save and can book them at any lab on MedEase."
        />
      </div>
      <DoctorLabOrderPanel
        appointment={appointment}
        order={order}
        tests={testTypes.map(({ id, name }) => ({ id, name }))}
      />
    </>
  );
}
