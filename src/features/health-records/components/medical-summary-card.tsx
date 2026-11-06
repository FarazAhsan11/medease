import Link from "next/link";

import { BadgeList } from "@/components/shared/badge-list";
import { DetailList } from "@/components/shared/detail-list";
import { PanelCard } from "@/components/shared/panel-card";
import { patientRoutes } from "@/config/routes";
import type { PatientProfile } from "@/features/settings/data/patient-profile";

const NOT_ADDED = "Not added";

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
            empty={NOT_ADDED}
          />
          <BadgeList
            label="Ongoing conditions"
            items={profile.chronicConditions}
            tone="info"
            empty={NOT_ADDED}
          />
        </div>
      </div>
    </PanelCard>
  );
}
