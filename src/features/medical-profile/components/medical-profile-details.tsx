import { BadgeList } from "@/components/shared/badge-list";
import { DetailList } from "@/components/shared/detail-list";
import type { MedicalProfile } from "@/features/medical-profile/lib/medical-profile";
import { CLINIC_TIMEZONE, formatDate } from "@/lib/datetime";

const NONE = "None recorded";
const NOT_GIVEN = "Not given";

// What the patient has told us about their health, for the doctor (PRO-02).
// Allergies come first: they matter most when prescribing.
export function MedicalProfileDetails({
  profile,
}: {
  profile: MedicalProfile;
}) {
  return (
    <div className="space-y-5">
      {profile.relation !== "self" && (
        <p className="text-sm">
          For <span className="font-medium">{profile.name}</span>, the account
          holder&apos;s {profile.relation}
        </p>
      )}
      <BadgeList
        label="Allergies"
        items={profile.allergies}
        tone="danger"
        empty={NONE}
      />
      <BadgeList
        label="Ongoing conditions"
        items={profile.chronicConditions}
        tone="info"
        empty={NONE}
      />
      <BadgeList
        label="Current medicines"
        items={profile.currentMedicines}
        tone="muted"
        empty={NONE}
      />
      <DetailList
        items={[
          { label: "Age", value: profile.age ?? NOT_GIVEN },
          { label: "Gender", value: profile.gender ?? NOT_GIVEN },
          { label: "Blood group", value: profile.bloodGroup ?? NOT_GIVEN },
          {
            label: "Height",
            value: profile.heightCm ? `${profile.heightCm} cm` : NOT_GIVEN,
          },
          {
            label: "Weight",
            value: profile.weightKg ? `${profile.weightKg} kg` : NOT_GIVEN,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Reported by the patient, last updated{" "}
        {formatDate(profile.updatedAt, CLINIC_TIMEZONE)}. Confirm allergies and
        medicines with them before prescribing.
      </p>
    </div>
  );
}
