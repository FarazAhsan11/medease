import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { patientRoutes } from "@/config/routes";
import { DoctorDirectory } from "@/features/doctors/components/doctor-directory";

export const metadata: Metadata = {
  title: "Find a doctor",
};

export default function PatientFindDoctorPage() {
  return (
    <>
      <DashboardPageHeader
        title="Find a doctor"
        description="Browse qualified specialists and book a consultation."
      />
      <DoctorDirectory searchAction={patientRoutes.findDoctor} />
    </>
  );
}
