import { ChecklistCard } from "@/components/shared/checklist-card";
import { twoFactorRoute } from "@/config/routes";
import type { LabVerification } from "@/features/lab-verification/data/lab-verification";

export function LabVerificationChecklist({
  verification,
}: {
  verification: LabVerification;
}) {
  return (
    <ChecklistCard
      title="Setup checklist"
      items={[
        // The lab area opens only after two-factor, so this is always ticked.
        {
          label: "Two-factor authentication",
          done: true,
          link: { href: twoFactorRoute, label: "Manage", always: true },
        },
        {
          label: "Licensing authority",
          done: verification.licensingAuthority !== null,
        },
        { label: "Licence", done: verification.hasLicense },
        {
          label: "Verified by our team",
          done: verification.status === "approved",
        },
      ]}
    />
  );
}
