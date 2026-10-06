import Image from "next/image";

import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentDetail } from "@/features/appointments/components/appointment-detail";
import { AppointmentSummary } from "@/features/appointments/components/appointment-summary";
import type { Appointment } from "@/features/appointments/data/appointments";

type UpcomingAppointmentCardProps = {
  appointment: Appointment;
};

const actionClass =
  "relative flex h-[50px] items-center justify-center gap-[5px] rounded-lg bg-brand-strong px-5 py-2.5 text-lg font-bold text-white";

export function UpcomingAppointmentCard({
  appointment,
}: UpcomingAppointmentCardProps) {
  return (
    <AppointmentCard
      image="/images/appointment-doctor.png"
      className="w-[668px]"
    >
      <AppointmentSummary appointment={appointment} />
      <AppointmentDetail label="Appointment Status">
        <span className="rounded-[5px] bg-danger-soft px-2.5 py-[5px] text-xs text-danger">
          Confirmed
        </span>
      </AppointmentDetail>

      <div className="mt-5 flex flex-col gap-2.5">
        <button type="button" className={actionClass}>
          <Image src="/images/calendar-add.svg" alt="" width={24} height={24} />
          Add to Calendar
        </button>
        <button
          type="button"
          disabled
          className={`${actionClass} group disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Image src="/images/video-call.png" alt="" width={24} height={24} />
          Video Call
          <span className="absolute -bottom-10 left-1/2 z-[100] hidden -translate-x-1/2 rounded bg-ink-body px-3 py-2 text-xs whitespace-nowrap text-white shadow-tooltip group-hover:block">
            Available 5 minutes before appointment
          </span>
        </button>
        <button
          type="button"
          className="h-[50px] rounded-lg bg-danger px-5 py-2.5 text-xl font-semibold text-white"
        >
          Cancel
        </button>
      </div>
    </AppointmentCard>
  );
}
