import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetailList } from "@/features/doctor-dashboard/components/detail-list";
import { PanelCard } from "@/features/doctor-dashboard/components/panel-card";
import type { PatientAppointment } from "@/features/doctor-dashboard/data/dashboard";

type PatientDetailsCardProps = {
  appointment: PatientAppointment;
};

export function PatientDetailsCard({ appointment }: PatientDetailsCardProps) {
  return (
    <PanelCard title="Patient details" className="h-fit">
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <UserAvatar name={appointment.patientName} className="size-11" />
          <div>
            <p className="text-sm font-semibold">{appointment.patientName}</p>
            <p className="text-xs text-muted-foreground">
              {appointment.reason} · {appointment.time}
            </p>
          </div>
        </div>
        <DetailList
          items={[
            { label: "Age", value: appointment.age },
            { label: "Gender", value: appointment.gender },
            { label: "Medical history", value: appointment.history },
            { label: "Last visit", value: appointment.lastVisit },
          ]}
        />
        <div className="grid gap-1.5 border-t pt-5">
          <Label htmlFor="consultation-notes">Consultation notes</Label>
          <Textarea
            id="consultation-notes"
            rows={4}
            placeholder="Add notes about this consultation…"
          />
          <Button type="button" className="mt-1 w-fit">
            Save notes
          </Button>
        </div>
      </div>
    </PanelCard>
  );
}
