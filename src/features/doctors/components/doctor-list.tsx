import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DoctorCard } from "@/features/doctors/components/doctor-card";
import type { DirectoryDoctor } from "@/features/doctors/data/doctor-directory";

type DoctorListProps = {
  doctors: DirectoryDoctor[];
  total: number;
  resetHref: string;
};

export function DoctorList({ doctors, total, resetHref }: DoctorListProps) {
  if (doctors.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="No doctors match your search"
        description="Try a different specialty or city, or clear the filters."
        action={
          <Link href={resetHref} className={buttonVariants()}>
            Clear filters
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{doctors.length}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>{" "}
        {total === 1 ? "doctor" : "doctors"}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </div>
  );
}
