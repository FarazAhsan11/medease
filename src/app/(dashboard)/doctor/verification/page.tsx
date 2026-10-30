import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { MissingProfileNotice } from "@/features/doctor-dashboard/components/missing-profile-notice";
import { VerificationChecklist } from "@/features/doctor-verification/components/verification-checklist";
import { VerificationDocumentsForm } from "@/features/doctor-verification/components/verification-documents-form";
import { VerificationStatusCard } from "@/features/doctor-verification/components/verification-status-card";
import { getDoctorVerification } from "@/features/doctor-verification/data/verification";
import { isOpenForReview } from "@/features/doctor-verification/lib/verification";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Verification",
};

export default async function DoctorVerificationPage() {
  const user = await requireRole("doctor");
  const verification = await getDoctorVerification(user.id);

  return (
    <>
      <DashboardPageHeader
        title="Verification"
        description="Patients can find you once our team has verified your details."
      />
      {verification ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="grid h-fit gap-6">
            <VerificationStatusCard verification={verification} />
            {isOpenForReview(verification.status) && (
              <VerificationDocumentsForm />
            )}
          </div>
          <VerificationChecklist verification={verification} />
        </div>
      ) : (
        <MissingProfileNotice />
      )}
    </>
  );
}
