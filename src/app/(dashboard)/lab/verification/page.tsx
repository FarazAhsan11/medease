import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { LabVerificationChecklist } from "@/features/lab-verification/components/lab-verification-checklist";
import { LabVerificationForm } from "@/features/lab-verification/components/lab-verification-form";
import { LabVerificationStatusCard } from "@/features/lab-verification/components/lab-verification-status-card";
import { getLabVerification } from "@/features/lab-verification/data/lab-verification";
import { requireRole } from "@/lib/auth/session";
import { isOpenForReview } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Verification",
};

export default async function LabVerificationPage() {
  const user = await requireRole("lab");
  const verification = await getLabVerification(user.id);

  // Every lab account gets a profile at sign-up.
  if (!verification) notFound();

  return (
    <>
      <DashboardPageHeader
        title="Verification"
        description="Patients can find your lab once our team has checked your licence."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid h-fit gap-6">
          <LabVerificationStatusCard verification={verification} />
          {isOpenForReview(verification.status) && (
            <LabVerificationForm verification={verification} />
          )}
        </div>
        <LabVerificationChecklist verification={verification} />
      </div>
    </>
  );
}
