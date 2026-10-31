import Link from "next/link";

import { DetailList } from "@/components/shared/detail-list";
import { PanelCard } from "@/components/shared/panel-card";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { patientRoutes } from "@/config/routes";
import type { PatientProfile } from "@/features/settings/data/patient-profile";

const NOT_ADDED = "Not added";

function BadgeList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: StatusTone;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <StatusBadge key={item} tone={tone}>
              {item}
            </StatusBadge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm font-medium">{NOT_ADDED}</p>
      )}
    </div>
  );
}

export function MedicalSummaryCard({ profile }: { profile: PatientProfile }) {
  const emergencyContact =
    [profile.emergencyContactName, profile.emergencyContactPhone]
      .filter(Boolean)
      .join(", ") || NOT_ADDED;

  return (
    <PanelCard
      title="Medical summary"
      className="h-fit"
      action={
        <Link
          href={patientRoutes.settings}
          className="text-sm font-medium text-primary hover:underline"
        >
          Edit
        </Link>
      }
    >
      <div className="space-y-5 p-5">
        <DetailList
          items={[
            { label: "Blood group", value: profile.bloodGroup ?? NOT_ADDED },
            { label: "Emergency contact", value: emergencyContact },
          ]}
        />
        <div className="space-y-5 border-t pt-5">
          <BadgeList
            label="Allergies"
            items={profile.allergies}
            tone="danger"
          />
          <BadgeList
            label="Ongoing conditions"
            items={profile.chronicConditions}
            tone="info"
          />
        </div>
      </div>
    </PanelCard>
  );
}
