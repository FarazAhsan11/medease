import { DoctorCard } from "@/features/doctors/components/doctor-card";
import type { Doctor } from "@/features/doctors/data/doctors";

type DoctorListProps = {
  doctors: Doctor[];
};

export function DoctorList({ doctors }: DoctorListProps) {
  return (
    <div className="ml-6 grid w-[86%] grid-cols-[repeat(3,1fr)] gap-5 max-[1400px]:grid-cols-[repeat(2,1fr)] max-md:ml-0 max-md:w-full max-md:grid-cols-[1fr] max-md:gap-[15px]">
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} />
      ))}
    </div>
  );
}
