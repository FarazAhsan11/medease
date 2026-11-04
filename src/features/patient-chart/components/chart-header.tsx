import { MailIcon, PhoneIcon } from "lucide-react";

import { DetailList } from "@/components/shared/detail-list";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { PatientChart } from "@/features/patient-chart/data/patient-chart";
import { formatDate, formatDateTime } from "@/lib/datetime";

export function ChartHeader({ chart }: { chart: PatientChart }) {
  const { patient, firstVisit, nextVisit, completedVisits } = chart;

  return (
    <section className="grid gap-5 rounded-2xl border bg-card p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <UserAvatar name={patient.name} className="size-12" />
          <h2 className="truncate text-base font-semibold">{patient.name}</h2>
        </div>
        <div className="mt-4 grid gap-1.5 text-sm">
          <a
            href={`mailto:${patient.email}`}
            className="flex min-w-0 items-center gap-2 text-primary hover:underline"
          >
            <MailIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{patient.email}</span>
          </a>
          {patient.phone && (
            <a
              href={`tel:${patient.phone.replace(/\s/g, "")}`}
              className="flex min-w-0 items-center gap-2 text-primary hover:underline"
            >
              <PhoneIcon className="size-4 shrink-0" aria-hidden />
              {patient.phone}
            </a>
          )}
        </div>
      </div>
      <DetailList
        items={[
          {
            label: "Completed visits",
            value: completedVisits,
          },
          {
            label: "First seen",
            value: formatDate(firstVisit.startsAt, firstVisit.timezone),
          },
          {
            label: "Next visit",
            value: nextVisit
              ? formatDateTime(nextVisit.startsAt, nextVisit.timezone)
              : "Not booked",
          },
        ]}
      />
    </section>
  );
}
