import { BriefcaseMedicalIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import type { DirectoryDoctor } from "@/features/doctors/data/doctor-directory";
import { formatFee } from "@/lib/format";

type DoctorCardProps = {
  doctor: DirectoryDoctor;
};

export function DoctorCard({ doctor }: DoctorCardProps) {
  const bookable = doctor.acceptingAppointments && doctor.hasSchedule;

  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-3">
        <UserAvatar name={doctor.fullName} className="size-12" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{doctor.fullName}</h3>
          <p className="text-sm text-muted-foreground">
            {doctor.specialization}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
        {doctor.city && (
          <li className="flex items-center gap-2">
            <MapPinIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{doctor.city}</span>
          </li>
        )}
        <li className="flex items-center gap-2">
          <BriefcaseMedicalIcon className="size-4 shrink-0" aria-hidden />
          {doctor.experienceYears} years experience
        </li>
      </ul>

      <div className="mt-4">
        {bookable ? (
          <StatusBadge tone="success" dot>
            Accepting appointments
          </StatusBadge>
        ) : (
          <StatusBadge tone="muted">Not taking bookings</StatusBadge>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Consultation</p>
          <p className="text-sm font-semibold">
            {formatFee(doctor.consultationFee)}
          </p>
        </div>
        <Link
          href={patientRoutes.bookDoctor(doctor.id)}
          className={buttonVariants({
            size: "sm",
            variant: bookable ? "default" : "outline",
            className: "h-8 px-3",
          })}
        >
          {bookable ? "Book appointment" : "View profile"}
        </Link>
      </div>
    </article>
  );
}
