import { PanelCard } from "@/components/shared/panel-card";
import { VerificationStatusBadge } from "@/features/doctor-verification/components/verification-status-badge";
import type { DoctorVerification } from "@/features/doctor-verification/data/verification";
import { hasAllDocuments } from "@/features/doctor-verification/lib/verification";

function describe({ status, documents }: DoctorVerification) {
  if (status === "approved") {
    return "You're verified. Patients can find you and book any open hours you've set.";
  }
  if (status === "rejected") {
    return "We couldn't verify your account. If you think this is a mistake, please contact support.";
  }
  if (status === "needs_info") {
    return "Upload what our team asked for below. Your account goes back into review as soon as you do.";
  }
  return hasAllDocuments(documents)
    ? "Our team is checking your details against the PMDC register. We'll email you when there's an update."
    : "Upload the missing documents below so our team can start checking your details.";
}

export function VerificationStatusCard({
  verification,
}: {
  verification: DoctorVerification;
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
