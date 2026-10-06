import {
  BriefcaseMedicalIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { RatingBadge } from "@/components/shared/rating-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Doctor } from "@/features/doctors/data/doctors";
import { formatFee } from "@/lib/format";

type DoctorProfileCardProps = {
  doctor: Doctor;
};

export function DoctorProfileCard({ doctor }: DoctorProfileCardProps) {
  const details = [
    {
      icon: BriefcaseMedicalIcon,
      value: `${doctor.experienceYears} years experience`,
    },
    { icon: MapPinIcon, value: doctor.location },
    { icon: PhoneIcon, value: doctor.phone },
    { icon: MailIcon, value: doctor.email },
    { icon: ClockIcon, value: "Mon – Sat, 11 AM – 4 PM" },
  ];

  return (
    <aside className="h-fit rounded-2xl border bg-card p-6">
      <div className="flex flex-col items-center text-center">
        <UserAvatar name={doctor.name} className="size-20 text-lg" />
        <h1 className="mt-4 text-lg font-semibold">{doctor.name}</h1>
        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <RatingBadge rating={doctor.rating} />
          {doctor.reviews} reviews
        </div>
      </div>

      <ul className="mt-6 grid gap-3 border-t pt-6 text-sm">
        {details.map(({ icon: Icon, value }) => (
          <li key={value} className="flex items-start gap-3">
            <Icon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="break-all">{value}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <span className="text-sm text-secondary-foreground">
          Consultation fee
        </span>
        <span className="text-sm font-semibold text-secondary-foreground">
          {formatFee(doctor.consultationFee)}
        </span>
      </div>
    </aside>
  );
}
