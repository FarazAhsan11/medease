import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { doctorRoutes } from "@/config/routes";
import { getAppointment } from "@/features/appointments/data/appointments";
import { MedicalProfileSheet } from "@/features/medical-profile/components/medical-profile-sheet";
import { getMedicalProfile } from "@/features/medical-profile/data/medical-profiles";
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
  // ConsultationView reads the same appointment (cached) and checks it's ours.
  const appointment = await getAppointment(appointmentId);
  const profile =
    appointment?.doctorId === user.id
      ? await getMedicalProfile(appointment.careRecipientId)
      : null;

  return (
    <ConsultationView
      appointmentId={appointmentId}
      role="doctor"
      userId={user.id}
      backHref={doctorRoutes.appointments}
      actions={
        <div className="flex flex-wrap gap-2">
          {profile && <MedicalProfileSheet profile={profile} />}
          {/* A new tab, so writing the prescription doesn't end the call. */}
          <Link
            href={doctorRoutes.prescription(appointmentId)}
            target="_blank"
            rel="noopener"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "gap-1.5",
            })}
          >
            Prescription
            <ExternalLinkIcon aria-hidden />
          </Link>
        </div>
      }
    />
  );
}
