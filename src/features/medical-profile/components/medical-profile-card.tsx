import { PanelCard } from "@/components/shared/panel-card";
import { MedicalProfileDetails } from "@/features/medical-profile/components/medical-profile-details";
import type { MedicalProfile } from "@/features/medical-profile/lib/medical-profile";

type MedicalProfileCardProps = {
  profile: MedicalProfile;
  className?: string;
};

export function MedicalProfileCard({
  profile,
  className,
}: MedicalProfileCardProps) {
  return (
    <PanelCard title="Medical profile" className={className}>
      <div className="p-5">
        <MedicalProfileDetails profile={profile} />
      </div>
    </PanelCard>
  );
}
