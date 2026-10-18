import { CalendarXIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { buttonVariants } from "@/components/ui/button";
import { CallNotice } from "@/features/video-call/components/call-notice";
import { CallRoom } from "@/features/video-call/components/call-room";
import { getCallAppointment } from "@/features/video-call/data/call-appointment";
import type { CallRole } from "@/features/video-call/lib/call-connection";
import { getIceServers } from "@/features/video-call/lib/ice-servers";

type ConsultationViewProps = {
  appointmentId: string;
  role: CallRole;
  userId: string;
  backHref: string;
};

export async function ConsultationView({
  appointmentId,
  role,
  userId,
  backHref,
}: ConsultationViewProps) {
  const appointment = await getCallAppointment(appointmentId);
  const ownId =
    role === "patient" ? appointment?.patientId : appointment?.doctorId;
  if (!appointment || ownId !== userId) notFound();

  const other =
    role === "patient"
      ? {
          name: appointment.doctorName,
          subtitle: appointment.doctorSpecialization,
        }
      : { name: appointment.patientName, subtitle: "Patient" };

  return (
    <>
      <BackLink href={backHref}>Back to appointments</BackLink>
      {appointment.status === "booked" ? (
        <CallRoom
          appointmentId={appointment.id}
          role={role}
          other={other}
          startsAt={appointment.startsAt}
          timezone={appointment.timezone}
          iceServers={getIceServers()}
          backHref={backHref}
        />
      ) : (
        <CallNotice
          icon={CalendarXIcon}
          title={
            appointment.status === "cancelled"
              ? "This appointment was cancelled"
              : "This appointment is already closed"
          }
          description="There's no call for it anymore."
        >
          <Link
            href={backHref}
            className={buttonVariants({ variant: "secondary" })}
          >
            Back to appointments
          </Link>
        </CallNotice>
      )}
    </>
  );
}
