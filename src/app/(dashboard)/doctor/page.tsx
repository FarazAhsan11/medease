import {
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import type { Stat } from "@/components/shared/stat-card";
import { StatGrid } from "@/components/shared/stat-grid";
import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes } from "@/config/routes";
import {
  getAppointmentNotes,
  listDoctorAppointments,
} from "@/features/appointments/data/appointments";
import { AppointmentsPanel } from "@/features/doctor-dashboard/components/appointments-panel";
import { RecentMessagesCard } from "@/features/doctor-dashboard/components/recent-messages-card";
import { messageThreads } from "@/features/doctor-dashboard/data/dashboard";
import {
  countPreviousVisits,
  groupDoctorAppointments,
  isToday,
  startingWithin,
  summarizePatients,
} from "@/features/doctor-dashboard/lib/practice";
import { getDoctorPrescriptionSummaries } from "@/features/prescriptions/data/prescriptions";
import { requireRole } from "@/lib/auth/session";
import { formatTime } from "@/lib/datetime";

export default async function DoctorOverviewPage() {
  const user = await requireRole("doctor");
  const [appointments, prescriptions] = await Promise.all([
    listDoctorAppointments(user.id),
    getDoctorPrescriptionSummaries(user.id),
  ]);
  const { upcoming, needsOutcome } = groupDoctorAppointments(appointments);

  const today = appointments.filter((item) => isToday(item));
  const activeToday = today.filter((item) => item.status !== "cancelled");
  const nextToday = upcoming.find((item) => isToday(item));
  const thisWeek = startingWithin(upcoming, 7);
  const notes = await getAppointmentNotes(today.map((item) => item.id));

  const stats: Stat[] = [
    {
      label: "Today's appointments",
      value: String(activeToday.length),
      hint: nextToday
        ? `Next at ${formatTime(nextToday.startsAt, nextToday.timezone)}`
        : "Nothing else today",
      icon: CalendarDaysIcon,
    },
    {
      label: "Next 7 days",
      value: String(thisWeek.length),
      hint: `${upcoming.length} upcoming in total`,
      icon: CalendarClockIcon,
    },
    {
      label: "Patients",
      value: String(summarizePatients(appointments).length),
      hint: "Everyone who has booked you",
      icon: UsersIcon,
    },
    {
      label: "Needs outcome",
      value: String(needsOutcome.length),
      hint:
        needsOutcome.length > 0 ? "Mark completed or no-show" : "All caught up",
      icon: ClipboardCheckIcon,
    },
  ];

  return (
    <>
      <DashboardPageHeader
        title={`Welcome back, ${user.name}`}
        description="Here's what's happening with your practice today."
        actions={
          <Link
            href={doctorRoutes.appointments}
            className={buttonVariants({
              variant: "outline",
              className: "h-9 gap-1.5 px-4",
            })}
          >
            <CalendarDaysIcon aria-hidden />
            Full schedule
          </Link>
        }
      />
      <StatGrid stats={stats} />
      <AppointmentsPanel
        appointments={today}
        notes={notes}
        previousVisits={countPreviousVisits(appointments)}
        prescriptions={prescriptions}
        nextAppointment={upcoming[0] ?? null}
      />
      <RecentMessagesCard threads={messageThreads} />
    </>
  );
}
