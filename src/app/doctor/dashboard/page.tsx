import type { Metadata } from "next";

import { AppointmentsTab } from "@/features/doctor-dashboard/components/appointments-tab";
import { DashboardTabs } from "@/features/doctor-dashboard/components/dashboard-tabs";
import { MessagesTab } from "@/features/doctor-dashboard/components/messages-tab";
import { PatientsTab } from "@/features/doctor-dashboard/components/patients-tab";
import { ProfileTab } from "@/features/doctor-dashboard/components/profile-tab";
import {
  doctorProfile,
  patientAppointments,
  patientMessages,
} from "@/features/doctor-dashboard/data/dashboard";

export const metadata: Metadata = {
  title: "Doctor Dashboard",
};

export default function DoctorDashboardPage() {
  return (
    <DashboardTabs
      doctorName={`${doctorProfile.firstName} ${doctorProfile.lastName}`}
      panels={{
        Appointments: <AppointmentsTab appointments={patientAppointments} />,
        Patients: <PatientsTab patients={patientAppointments} />,
        Messages: <MessagesTab messages={patientMessages} />,
        Profile: <ProfileTab profile={doctorProfile} />,
      }}
    />
  );
}
