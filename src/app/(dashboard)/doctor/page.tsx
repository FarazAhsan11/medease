import { CalendarDaysIcon } from "lucide-react";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { buttonVariants } from "@/components/ui/button";
import { AppointmentsPanel } from "@/features/doctor-dashboard/components/appointments-panel";
import { RecentMessagesCard } from "@/features/doctor-dashboard/components/recent-messages-card";
import { requireRole } from "@/lib/auth/session";
import {
  doctorStats,
  messageThreads,
  patientAppointments,
} from "@/features/doctor-dashboard/data/dashboard";

export default async function DoctorOverviewPage() {
  const user = await requireRole("doctor");
  return (
    <>
      <DashboardPageHeader
        title={`Good morning, ${user.name}`}
        description="Here's what's happening with your practice today."
        actions={
          <Link
            href="/doctor/appointments"
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
      <StatGrid stats={doctorStats} />
      <AppointmentsPanel appointments={patientAppointments} />
      <RecentMessagesCard threads={messageThreads} />
    </>
  );
}
