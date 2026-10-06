import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentDetail } from "@/features/appointments/components/appointment-detail";
import { AppointmentSummary } from "@/features/appointments/components/appointment-summary";
import type { Appointment } from "@/features/appointments/data/appointments";

type PastAppointmentCardProps = {
  appointment: Appointment;
};

export function PastAppointmentCard({ appointment }: PastAppointmentCardProps) {
  return (
    <AppointmentCard
      image="/images/doctor-avatar.png"
      className="w-[640px] cursor-pointer transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-appointment-hover"
    >
      <AppointmentSummary appointment={appointment} />
      <AppointmentDetail label="Rating & Review">
        ★★★★ <span>(4/5)</span>
      </AppointmentDetail>
      <button
        type="button"
        className="flex h-[50px] w-1/2 items-center justify-center rounded-lg bg-brand-strong px-5 py-2.5 text-base font-bold text-white max-md:w-full"
      >
        View Details
      </button>
    </AppointmentCard>
  );
}
