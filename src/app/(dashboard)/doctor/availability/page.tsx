import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { listDoctorAppointments } from "@/features/appointments/data/appointments";
import { MissingProfileNotice } from "@/features/doctor-dashboard/components/missing-profile-notice";
import { ScheduleForm } from "@/features/doctor-dashboard/components/schedule-form";
import { TimeOffPanel } from "@/features/doctor-dashboard/components/time-off-panel";
import { getDoctorProfile } from "@/features/doctor-dashboard/data/doctor-profile";
import { listTimeOff } from "@/features/doctor-dashboard/data/time-off";
import { getWeeklyHours } from "@/features/doctors/data/doctor-directory";
import { requireRole } from "@/lib/auth/session";
import { toDateKey } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Availability",
};

export default async function DoctorAvailabilityPage() {
  const user = await requireRole("doctor");
  const [profile, hours] = await Promise.all([
    getDoctorProfile(user.id),
    getWeeklyHours(user.id),
  ]);

  if (!profile) {
    return (
      <>
        <DashboardPageHeader
          title="Availability"
          description="Set the hours patients can book and how long each appointment lasts."
        />
        <MissingProfileNotice />
      </>
    );
  }

  const today = toDateKey(new Date(), profile.timezone);
  const [timeOff, upcoming] = await Promise.all([
    listTimeOff(user.id, today),
    listDoctorAppointments(user.id, { since: new Date() }),
  ]);
  const affected = upcoming.filter((appointment) => {
    const day = toDateKey(appointment.startsAt, appointment.timezone);
    return (
      appointment.status === "booked" &&
      timeOff.some(({ startsOn, endsOn }) => day >= startsOn && day <= endsOn)
    );
  });

  return (
    <>
      <DashboardPageHeader
        title="Availability"
        description="Set the hours patients can book and how long each appointment lasts."
      />
      <ScheduleForm
        hours={hours}
        slotMinutes={profile.slotMinutes}
        accepting={profile.acceptingAppointments}
        fee={profile.consultationFee}
      />
      <TimeOffPanel today={today} entries={timeOff} affected={affected} />
    </>
  );
}
