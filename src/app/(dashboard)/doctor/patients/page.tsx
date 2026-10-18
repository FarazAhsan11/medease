import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { Input } from "@/components/ui/input";
import { doctorRoutes } from "@/config/routes";
import { listDoctorAppointments } from "@/features/appointments/data/appointments";
import { PatientsPanel } from "@/features/doctor-dashboard/components/patients-panel";
import { summarizePatients } from "@/features/doctor-dashboard/lib/practice";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Patients",
};

export default async function DoctorPatientsPage({
  searchParams,
}: PageProps<"/doctor/patients">) {
  const user = await requireRole("doctor");
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").trim().toLowerCase();

  const patients = summarizePatients(await listDoctorAppointments(user.id));
  const filtered = query
    ? patients.filter((patient) =>
        [patient.name, patient.email, patient.phone ?? ""].some((value) =>
          value.toLowerCase().includes(query),
        ),
      )
    : patients;

  return (
    <>
      <DashboardPageHeader
        title="Patients"
        description="Everyone who has booked an appointment with you."
        actions={
          <form
            action={doctorRoutes.patients}
            className="relative w-full sm:w-64"
          >
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              name="q"
              defaultValue={query}
              aria-label="Search patients"
              placeholder="Search name, email or phone"
              className="h-9 bg-card pl-9"
            />
          </form>
        }
      />
      <PatientsPanel patients={filtered} searching={Boolean(query)} />
    </>
  );
}
