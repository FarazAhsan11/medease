import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { AppointmentsPanel } from "@/features/doctor-dashboard/components/appointments-panel";
import { DashboardHeader } from "@/features/doctor-dashboard/components/dashboard-header";
import { DashboardTabs } from "@/features/doctor-dashboard/components/dashboard-tabs";
import { MessagesPanel } from "@/features/doctor-dashboard/components/messages-panel";
import { PatientsPanel } from "@/features/doctor-dashboard/components/patients-panel";
import { ProfilePanel } from "@/features/doctor-dashboard/components/profile-panel";
import { StatCard } from "@/features/doctor-dashboard/components/stat-card";
import {
  dashboardStats,
  doctorProfile,
  patientAppointments,
  patientMessages,
} from "@/features/doctor-dashboard/data/dashboard";

export const metadata: Metadata = {
  title: "Doctor Dashboard",
};

export default function DoctorDashboardPage() {
  return (
    <Container className="space-y-8 py-8">
      <DashboardHeader profile={doctorProfile} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <DashboardTabs
        tabs={[
          {
            value: "appointments",
            label: "Appointments",
            content: <AppointmentsPanel appointments={patientAppointments} />,
          },
          {
            value: "patients",
            label: "Patients",
            content: <PatientsPanel patients={patientAppointments} />,
          },
          {
            value: "messages",
            label: "Messages",
            content: <MessagesPanel messages={patientMessages} />,
          },
          {
            value: "profile",
            label: "Profile",
            content: <ProfilePanel profile={doctorProfile} />,
          },
        ]}
      />
    </Container>
  );
}
