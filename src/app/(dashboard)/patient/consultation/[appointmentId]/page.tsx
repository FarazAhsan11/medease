import type { Metadata } from "next";

import { patientRoutes } from "@/config/routes";
import { ConsultationView } from "@/features/video-call/components/consultation-view";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Video consultation",
};

export default async function PatientConsultationPage({
  params,
}: PageProps<"/patient/consultation/[appointmentId]">) {
  const user = await requireRole("patient");
  const { appointmentId } = await params;

  return (
    <ConsultationView
      appointmentId={appointmentId}
      role="patient"
      userId={user.id}
      backHref={patientRoutes.appointments}
    />
  );
}
