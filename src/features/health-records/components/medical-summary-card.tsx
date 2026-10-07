import { DetailList } from "@/components/shared/detail-list";
import { PanelCard } from "@/components/shared/panel-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { medicalSummary } from "@/features/health-records/data/health-records";

export function MedicalSummaryCard() {
  return (
    <PanelCard title="Medical summary" className="h-fit">
      <div className="space-y-5 p-5">
        <DetailList
          items={[
            { label: "Blood group", value: medicalSummary.bloodGroup },
            {
              label: "Emergency contact",
              value: medicalSummary.emergencyContact,
            },
          ]}
        />
        <div className="border-t pt-5">
          <p className="text-sm text-muted-foreground">Allergies</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {medicalSummary.allergies.map((allergy) => (
              <StatusBadge key={allergy} tone="danger">
                {allergy}
              </StatusBadge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Ongoing conditions</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {medicalSummary.conditions.map((condition) => (
              <StatusBadge key={condition} tone="info">
                {condition}
              </StatusBadge>
            ))}
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
