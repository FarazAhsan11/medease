import {
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  FlaskConicalIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import type { Stat } from "@/components/shared/stat-card";
import { StatGrid } from "@/components/shared/stat-grid";
import { VerificationBanner } from "@/components/shared/verification-banner";
import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes } from "@/config/routes";
import {
  getAppointmentNotes,
  listDoctorAppointments,
} from "@/features/appointments/data/appointments";
import { AppointmentsPanel } from "@/features/doctor-dashboard/components/appointments-panel";
import {
  countPreviousVisits,
  groupDoctorAppointments,
  isToday,
  startingWithin,
  summarizePatients,
} from "@/features/doctor-dashboard/lib/practice";
import { getDoctorVerification } from "@/features/doctor-verification/data/verification";
import { doctorBannerText } from "@/features/doctor-verification/lib/verification";
import { getDoctorPrescriptionSummaries } from "@/features/prescriptions/data/prescriptions";
import {
  RECENT_MESSAGES_SHOWN,
  RecentMessagesCard,
} from "@/features/messaging/components/recent-messages-card";
import { listConversations } from "@/features/messaging/data/messaging";
import { getMedicalProfiles } from "@/features/medical-profile/data/medical-profiles";
import {
  countResultsToReview,
  getLabOrders,
} from "@/features/lab-orders/data/lab-orders";
import { getVisitSummaries } from "@/features/visit-summaries/data/visit-summaries";
import { requireRole } from "@/lib/auth/session";
import { formatTime } from "@/lib/datetime";

export default async function DoctorOverviewPage() {
  const user = await requireRole("doctor");
  const [appointments, prescriptions, verification, conversations, toReview] =
    await Promise.all([
      listDoctorAppointments(user.id),
      getDoctorPrescriptionSummaries(user.id),
      getDoctorVerification(user.id),
      listConversations("doctor", RECENT_MESSAGES_SHOWN),
      countResultsToReview(),
    ]);
  const { upcoming, needsOutcome } = groupDoctorAppointments(appointments);

  const today = appointments.filter((item) => isToday(item));
  const activeToday = today.filter((item) => item.status !== "cancelled");
  const nextToday = upcoming.find((item) => isToday(item));
  const thisWeek = startingWithin(upcoming, 7);
  const todayIds = today.map((item) => item.id);
  const [notes, summaries, labOrders, profiles] = await Promise.all([
    getAppointmentNotes(todayIds),
    getVisitSummaries(todayIds),
    getLabOrders(todayIds),
    getMedicalProfiles(today.map((item) => item.careRecipientId)),
  ]);

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
    {
      label: "Results to review",
      value: String(toReview),
      hint: toReview > 0 ? "Lab reports from your orders" : "All caught up",
      icon: FlaskConicalIcon,
      href: doctorRoutes.labResults,
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
      {verification && (
        <VerificationBanner
          status={verification.status}
          title="Your profile isn't live"
          descriptions={doctorBannerText}
          href={doctorRoutes.verification}
        />
      )}
      <StatGrid stats={stats} />
      <AppointmentsPanel
        appointments={today}
        notes={notes}
        previousVisits={countPreviousVisits(appointments)}
        prescriptions={prescriptions}
        summaries={summaries}
        labOrders={labOrders}
        profiles={profiles}
        nextAppointment={upcoming[0] ?? null}
      />
      <RecentMessagesCard
        userId={user.id}
        role="doctor"
        conversations={conversations}
      />
    </>
  );
}
