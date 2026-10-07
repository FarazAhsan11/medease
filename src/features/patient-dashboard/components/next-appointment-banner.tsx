import { CalendarIcon, ClockIcon, VideoIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { buttonVariants } from "@/components/ui/button";
import type { Appointment } from "@/features/appointments/data/appointments";
import { cn } from "@/lib/utils";

type NextAppointmentBannerProps = {
  patientName: string;
  appointment: Appointment;
};

export function NextAppointmentBanner({
  patientName,
  appointment,
}: NextAppointmentBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
      <div
        aria-hidden
        className="absolute -top-20 -right-20 size-64 rounded-full bg-white/10"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-white/80">Good morning,</p>
          <h1 className="text-2xl font-semibold">{patientName}</h1>
          <p className="mt-1 text-sm text-white/80">
            Here&apos;s a quick look at your health today.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-white/10 p-4 backdrop-blur sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={appointment.doctorName}
              className="size-11 ring-2 ring-white/30"
            />
            <div>
              <p className="text-xs text-white/70">Next appointment</p>
              <p className="text-sm font-semibold">{appointment.doctorName}</p>
              <p className="flex flex-wrap gap-x-3 text-xs text-white/80">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3" aria-hidden />
                  {appointment.date}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3" aria-hidden />
                  {appointment.time}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/video-call"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "h-9 gap-1.5 px-4",
            )}
          >
            <VideoIcon aria-hidden />
            Join call
          </Link>
        </div>
      </div>
    </section>
  );
}
