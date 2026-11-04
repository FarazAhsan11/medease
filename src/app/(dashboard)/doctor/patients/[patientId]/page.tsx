import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { doctorRoutes } from "@/config/routes";
import { ChartHeader } from "@/features/patient-chart/components/chart-header";
import { ChartVisitCard } from "@/features/patient-chart/components/chart-visit-card";
import { getPatientChart } from "@/features/patient-chart/data/patient-chart";
import { requireRole } from "@/lib/auth/session";

// The patient's name stays out of the tab title and browser history.
export const metadata: Metadata = {
  title: "Patient chart",
};

export default async function DoctorPatientChartPage({
  params,
}: PageProps<"/doctor/patients/[patientId]">) {
  const user = await requireRole("doctor");
  const { patientId } = await params;
  const chart = await getPatientChart(user.id, patientId);
  if (!chart) notFound();

  return (
    <>
      <BackLink href={doctorRoutes.patients}>All patients</BackLink>
      <DashboardPageHeader
        title="Patient chart"
        description="Your visits with this patient, newest first, with your notes, the summaries you wrote and your prescriptions."
      />
      <ChartHeader chart={chart} />
      <div className="grid gap-4">
        {chart.appointments.map((appointment) => (
          <ChartVisitCard
            key={appointment.id}
            appointment={appointment}
            notes={chart.notes[appointment.id] ?? ""}
            previousVisits={chart.previousVisits[appointment.id] ?? 0}
            prescription={chart.prescriptions[appointment.id] ?? null}
            summary={chart.summaries[appointment.id] ?? null}
          />
        ))}
      </div>
    </>
  );
}
