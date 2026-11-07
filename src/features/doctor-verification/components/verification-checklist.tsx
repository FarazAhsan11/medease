import { ChecklistCard } from "@/components/shared/checklist-card";
import { doctorRoutes, twoFactorRoute } from "@/config/routes";
import type { DoctorVerification } from "@/features/doctor-verification/data/verification";

export function VerificationChecklist({
  verification,
}: {
  verification: DoctorVerification;
}) {
  const { documents, hasHours, status } = verification;

  return (
    <ChecklistCard
      title="Setup checklist"
      items={[
        // The doctor area opens only after two-factor, so this is always ticked.
        {
          label: "Two-factor authentication",
          done: true,
          link: { href: twoFactorRoute, label: "Manage", always: true },
        },
        { label: "Profile photo", done: documents.photo },
        { label: "PMDC license", done: documents.license },
        { label: "Degree certificate", done: documents.degree },
        {
          label: "Weekly hours",
          done: hasHours,
          link: { href: doctorRoutes.availability, label: "Set up" },
        },
        { label: "Verified by our team", done: status === "approved" },
      ]}
    />
  );
}
