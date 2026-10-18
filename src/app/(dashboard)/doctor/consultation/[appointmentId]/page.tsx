import type { Metadata } from "next";

import { doctorRoutes } from "@/config/routes";
import { ConsultationView } from "@/features/video-call/components/consultation-view";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Video consultation",
};

export default async function DoctorConsultationPage({
  params,
}: PageProps<"/doctor/consultation/[appointmentId]">) {
  const user = await requireRole("doctor");
  const { appointmentId } = await params;

  return (
    <ConsultationView
      appointmentId={appointmentId}
      role="doctor"
      userId={user.id}
      backHref={doctorRoutes.appointments}
    />
  );
}
