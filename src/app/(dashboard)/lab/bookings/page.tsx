import { ClipboardListIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { labRoutes } from "@/config/routes";
import { LabBookingDayList } from "@/features/lab-booking/components/lab-booking-day-list";
import { LabBookingStageLinks } from "@/features/lab-booking/components/lab-booking-stage-links";
import {
  EARLIER_BOOKINGS_SHOWN,
  getLabBookings,
  getOpenLabBookingCounts,
  LAB_BOOKINGS_SHOWN,
} from "@/features/lab-booking/data/lab-bookings";
import {
  LAB_TIMEZONE,
  labBookingStages,
  type LabBookingStage,
} from "@/features/lab-booking/lib/lab-bookings";
import { toDateKey } from "@/lib/datetime";
import { searchParam } from "@/lib/directory-search";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Bookings",
};

const emptyTitles: Record<LabBookingStage, string> = {
  "to-collect": "Nothing to collect",
  "in-lab": "No samples in the lab",
  finished: "No finished bookings yet",
};

export default async function LabBookingsPage({
  searchParams,
}: PageProps<"/lab/bookings">) {
  const requested = searchParam((await searchParams).stage);
  const stage: LabBookingStage =
    labBookingStages.find((value) => value === requested) ?? "to-collect";
  const user = await requireRole("lab");
  const [{ bookings, more, earlier }, counts] = await Promise.all([
    getLabBookings(user.id, stage),
    getOpenLabBookingCounts(user.id),
  ]);
  const today = toDateKey(new Date(), LAB_TIMEZONE);
  const leftOver = earlier?.bookings ?? [];

  return (
    <>
      <DashboardPageHeader
        title="Bookings"
        description="Lab visits and home collections booked on MedEase. Move each one along as you work, and the patient follows it. Payment is in cash for now."
      />
      <LabBookingStageLinks
        basePath={labRoutes.bookings}
        active={stage}
        counts={counts}
      />
      {bookings.length === 0 && leftOver.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={emptyTitles[stage]}
          description={
            stage === "to-collect"
              ? "Patients book your listed tests from the lab tests pages. New bookings also show in your notifications."
              : "Bookings move here as you update them."
          }
        />
      ) : (
        <div className="space-y-10">
          {bookings.length > 0 ? (
            <LabBookingDayList
              bookings={bookings}
              more={
                more
                  ? `Showing the first ${LAB_BOOKINGS_SHOWN} bookings.`
                  : undefined
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing booked from today on.
            </p>
          )}
          {leftOver.length > 0 && (
            <section className="space-y-4" aria-labelledby="earlier-heading">
              <div>
                <h2 id="earlier-heading" className="text-base font-semibold">
                  Still open from earlier days
                </h2>
                <p className="text-sm text-muted-foreground">
                  Collect these, ask for a new sample, or cancel them with a
                  reason, so the patient knows where they stand.
                </p>
              </div>
              <LabBookingDayList
                bookings={leftOver}
                markBefore={today}
                more={
                  earlier?.more
                    ? `Showing the latest ${EARLIER_BOOKINGS_SHOWN} of these.`
                    : undefined
                }
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
