import { PanelCard } from "@/components/shared/panel-card";
import { VerificationStatusBadge } from "@/components/shared/verification-status-badge";
import type { LabVerification } from "@/features/lab-verification/data/lab-verification";

function describe({ status, hasLicense, licensingAuthority }: LabVerification) {
  if (status === "approved") {
    return "Your lab is verified. Patients can find it on MedEase.";
  }
  if (status === "rejected") {
    return "We couldn't verify your lab. If you think this is a mistake, please contact support.";
  }
  if (status === "needs_info") {
    return "Update what our team asked for below. Your lab goes back into review as soon as you send it.";
  }
  return hasLicense && licensingAuthority
    ? "Our team is checking your licence with the healthcare commission. We'll email you when there's an update."
    : "Add your licence details below so our team can start checking them.";
}

export function LabVerificationStatusCard({
  verification,
}: {
  verification: LabVerification;
}) {
  return (
    <PanelCard
      title="Status"
      action={<VerificationStatusBadge status={verification.status} />}
    >
      <div className="grid gap-3 p-5 text-sm">
        <p className="text-muted-foreground">{describe(verification)}</p>
        {verification.note && (
          <p className="rounded-xl bg-muted px-4 py-3">
            <span className="font-medium">From our team: </span>
            {verification.note}
          </p>
        )}
      </div>
    </PanelCard>
  );
}
