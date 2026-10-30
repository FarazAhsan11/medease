import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";

import { IconTile } from "@/components/shared/icon-tile";
import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes } from "@/config/routes";
import { VerificationStatusBadge } from "@/features/doctor-verification/components/verification-status-badge";
import type { DoctorVerification } from "@/features/doctor-verification/data/verification";

const descriptions = {
  pending:
    "Patients can't find you yet. Finish your checklist so our team can verify you.",
  needs_info: "Our team needs something from you before you can go live.",
  rejected: "We couldn't verify your account. See why on your status page.",
};

// Only doctors who aren't live yet see this.
export function VerificationBanner({
  verification,
}: {
  verification: DoctorVerification;
}) {
  if (verification.status === "approved") return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
      <IconTile icon={ShieldAlertIcon} tone="warning" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">
            Your profile isn&apos;t live
          </h2>
          <VerificationStatusBadge status={verification.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {descriptions[verification.status]}
        </p>
      </div>
      <Link
        href={doctorRoutes.verification}
        className={buttonVariants({ variant: "outline", className: "h-9" })}
      >
        View status
      </Link>
    </section>
  );
}
