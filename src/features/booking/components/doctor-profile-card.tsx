import { BriefcaseMedicalIcon, ClockIcon, MapPinIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { WeeklyHoursList } from "@/components/shared/weekly-hours-list";
import type {
  DirectoryDoctor,
  WeeklyHours,
} from "@/features/doctors/data/doctor-directory";
import { formatFee } from "@/lib/format";

type DoctorProfileCardProps = {
  doctor: DirectoryDoctor;
  hours: WeeklyHours[];
};

export function DoctorProfileCard({ doctor, hours }: DoctorProfileCardProps) {
  const details = [
    {
      icon: BriefcaseMedicalIcon,
      value: `${doctor.experienceYears} years experience`,
    },
    { icon: MapPinIcon, value: doctor.clinicAddress },
    { icon: ClockIcon, value: `${doctor.slotMinutes}-minute appointments` },
  ];

  return (
    <aside className="h-fit rounded-2xl border bg-card p-6">
      <div className="flex flex-col items-center text-center">
        <UserAvatar name={doctor.fullName} className="size-20 text-lg" />
        <h1 className="mt-4 text-lg font-semibold">{doctor.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          {doctor.specialization}
          {doctor.city && ` · ${doctor.city}`}
        </p>
      </div>

      {doctor.bio && (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          {doctor.bio}
        </p>
      )}

      <ul className="mt-6 grid gap-3 border-t pt-6 text-sm">
        {details.map(({ icon: Icon, value }) => (
          <li key={value} className="flex items-start gap-3">
            <Icon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span>{value}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t pt-6">
        <h2 className="mb-3 text-sm font-semibold">Weekly hours</h2>
        <WeeklyHoursList hours={hours} />
      </div>

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
