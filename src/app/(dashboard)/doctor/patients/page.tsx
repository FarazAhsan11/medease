import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { Input } from "@/components/ui/input";
import { PatientsPanel } from "@/features/doctor-dashboard/components/patients-panel";
import { patientAppointments } from "@/features/doctor-dashboard/data/dashboard";

export const metadata: Metadata = {
  title: "Patients",
};

export default function DoctorPatientsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Patients"
        description="People you've consulted with recently."
        actions={
          <div className="relative w-full sm:w-64">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              aria-label="Search patients"
              placeholder="Search patients"
              className="h-9 bg-card pl-9"
            />
          </div>
        }
      />
      <PatientsPanel patients={patientAppointments} />
    </>
  );
}
