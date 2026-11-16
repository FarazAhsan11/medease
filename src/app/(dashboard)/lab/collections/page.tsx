import { RouteIcon } from "lucide-react";
import type { Metadata } from "next";
import { z } from "zod";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LAB_TIMEZONE } from "@/features/lab-booking/lib/lab-bookings";
import { CashSummary } from "@/features/lab-collections/components/cash-summary";
import { CollectionDayNav } from "@/features/lab-collections/components/collection-day-nav";
import { CollectionVisitCard } from "@/features/lab-collections/components/collection-visit-card";
import {
  EARLIER_VISITS_SHOWN,
  getCashSummary,
  getCollectionVisits,
  getEarlierOpenVisits,
} from "@/features/lab-collections/data/collections";
import {
  memberCan,
  requireLabMember,
} from "@/features/lab-staff/lib/lab-member.server";
import { toDateKey } from "@/lib/datetime";
import { searchParam } from "@/lib/directory-search";

export const metadata: Metadata = {
  title: "Collections",
};

const dayParam = z.iso.date();

export default async function LabCollectionsPage({
  searchParams,
}: PageProps<"/lab/collections">) {
  const member = await requireLabMember("bookings.collect");
  const today = toDateKey(new Date(), LAB_TIMEZONE);
  const requested = dayParam.safeParse(searchParam((await searchParams).day));
  const day = requested.success ? requested.data : today;
  const userId = member.user.id;

  const [visits, earlier, summary] = await Promise.all([
    getCollectionVisits(member.labId, userId, day),
    day === today
      ? getEarlierOpenVisits(member.labId, userId, today)
      : Promise.resolve(null),
    getCashSummary(day),
  ]);
  const leftOver = earlier?.visits ?? [];

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <DashboardPageHeader
        title="Collections"
        description="The home visits given to you, in window order, with the address, the patient's phone and what to collect. Mark each sample collected and the cash you take."
      />
      <CollectionDayNav day={day} today={today} />
      <CashSummary
        rows={summary}
        viewerId={userId}
        everyone={memberCan(member, "bookings.view_all")}
      />

      {leftOver.length > 0 && (
        <section className="grid gap-3" aria-labelledby="earlier-heading">
          <div>
            <h2 id="earlier-heading" className="text-base font-semibold">
              Still open from earlier days
            </h2>
            <p className="text-sm text-muted-foreground">
              Collect these or tell the front desk, so the patient knows where
              they stand.
              {earlier?.more &&
                ` Showing the latest ${EARLIER_VISITS_SHOWN}.`}
            </p>
          </div>
          {leftOver.map((visit) => (
            <CollectionVisitCard
              key={visit.booking.id}
              visit={visit}
              role={member.role}
              showDate
            />
          ))}
        </section>
      )}

      <section className="grid gap-3" aria-labelledby="day-heading">
        <h2 id="day-heading" className="sr-only">
          Visits
        </h2>
        {visits.length === 0 ? (
          <EmptyState
            icon={RouteIcon}
            title="No home visits"
            description={
              day === today
                ? "Visits the front desk gives you show here, and you're told about each one."
                : "Nothing is given to you on this day."
            }
          />
        ) : (
          visits.map((visit) => (
            <CollectionVisitCard
              key={visit.booking.id}
              visit={visit}
              role={member.role}
            />
          ))
        )}
      </section>
    </div>
  );
}
