import { BriefcaseMedicalIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";

import { RatingBadge } from "@/components/shared/rating-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import type { Doctor } from "@/features/doctors/data/doctors";
import { formatFee } from "@/lib/format";

type DoctorCardProps = {
  doctor: Doctor;
};

export function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-3">
        <UserAvatar name={doctor.name} className="size-12" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{doctor.name}</h3>
          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
        </div>
        <RatingBadge rating={doctor.rating} />
      </div>

      <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <MapPinIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{doctor.location}</span>
        </li>
        <li className="flex items-center gap-2">
          <BriefcaseMedicalIcon className="size-4 shrink-0" aria-hidden />
          {doctor.experienceYears} years experience
        </li>
      </ul>

      <div className="mt-4">
        {doctor.availableNow ? (
          <Badge className="bg-success-soft text-success">
            <span className="size-1.5 rounded-full bg-current" />
            Available today
          </Badge>
        ) : (
          <Badge variant="secondary">Next available tomorrow</Badge>
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
          className={buttonVariants({ size: "sm", className: "h-8 px-3" })}
        >
          Book appointment
        </Link>
      </div>
    </article>
  );
}
