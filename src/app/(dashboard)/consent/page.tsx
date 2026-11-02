import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { PanelCard } from "@/components/shared/panel-card";
import { dashboards } from "@/config/dashboards";
import { ConsentForm } from "@/features/consent/components/consent-form";
import { getPendingConsents } from "@/features/consent/data/consents";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Review and accept",
};

// Open to every role, outside the role areas: those redirect here, so it can't
// sit behind their gate.
export default async function ConsentPage() {
  const user = await getSessionUser();
  if (!user) redirect(dashboards.patient.loginHref);

  const pending = await getPendingConsents(user.role);
  if (pending.length === 0) redirect(dashboards[user.role].home);

  return (
    <>
      <DashboardPageHeader
        title="Review and accept"
        description="Please read these and accept them to carry on using MedEase."
      />
      <PanelCard title="Your agreement" className="max-w-lg">
        <div className="p-5">
          <ConsentForm documents={pending} />
        </div>
      </PanelCard>
    </>
  );
}
