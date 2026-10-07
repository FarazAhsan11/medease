import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { DetailList } from "@/components/shared/detail-list";
import type { PatientAppointment } from "@/features/doctor-dashboard/data/dashboard";

type PatientsPanelProps = {
  patients: PatientAppointment[];
};

export function PatientsPanel({ patients }: PatientsPanelProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {patients.map((patient) => (
        <article key={patient.id} className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <UserAvatar name={patient.patientName} className="size-11" />
            <div>
              <h3 className="text-sm font-semibold">{patient.patientName}</h3>
              <p className="text-xs text-muted-foreground">
                {patient.age} yrs · {patient.gender}
              </p>
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            <DetailList
              items={[
                { label: "Last visit", value: patient.lastVisit },
                {
                  label: "History",
                  value: <Badge variant="secondary">{patient.history}</Badge>,
                },
              ]}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
