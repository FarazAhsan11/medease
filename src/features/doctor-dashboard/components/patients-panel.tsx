import { MailIcon, PhoneIcon, UsersIcon } from "lucide-react";

import { DetailList } from "@/components/shared/detail-list";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { PatientSummary } from "@/features/doctor-dashboard/lib/practice";
import { formatDate, formatDateTime } from "@/lib/datetime";

type PatientsPanelProps = {
  patients: PatientSummary[];
  searching: boolean;
};

export function PatientsPanel({ patients, searching }: PatientsPanelProps) {
  if (patients.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title={searching ? "No patients match your search" : "No patients yet"}
        description={
          searching
            ? "Try a different name, email or phone number."
            : "Patients appear here after they book an appointment with you."
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {patients.map((patient) => (
        <article
          key={patient.patientId}
          className="rounded-2xl border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <UserAvatar name={patient.name} className="size-11" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{patient.name}</h3>
              <p className="text-xs text-muted-foreground">
                {patient.completedVisits === 1
                  ? "1 completed visit"
                  : `${patient.completedVisits} completed visits`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-1.5 text-sm">
            <a
              href={`mailto:${patient.email}`}
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <MailIcon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{patient.email}</span>
            </a>
            {patient.phone && (
              <a
                href={`tel:${patient.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <PhoneIcon className="size-4 shrink-0" aria-hidden />
                {patient.phone}
              </a>
            )}
          </div>

          <div className="mt-4 border-t pt-4">
            <DetailList
              items={[
                {
                  label: "Last visit",
                  value: patient.lastVisit
                    ? formatDate(
                        patient.lastVisit.startsAt,
                        patient.lastVisit.timezone,
                      )
                    : "None yet",
                },
                {
                  label: "Next visit",
                  value: patient.nextVisit
                    ? formatDateTime(
                        patient.nextVisit.startsAt,
                        patient.nextVisit.timezone,
                      )
                    : "Not booked",
                },
              ]}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
