import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

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
      actions={
        // A new tab, so writing the prescription doesn't end the call.
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
      }
    />
  );
}
