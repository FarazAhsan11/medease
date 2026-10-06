import { DoctorCard } from "@/features/doctors/components/doctor-card";
import type { Doctor } from "@/features/doctors/data/doctors";

type DoctorListProps = {
  doctors: Doctor[];
  total: number;
};

export function DoctorList({ doctors, total }: DoctorListProps) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{doctors.length}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> doctors
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </div>
  );
}
