import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { PanelCard } from "@/components/shared/panel-card";
import { dashboards } from "@/config/dashboards";
import { TwoFactorFlow } from "@/features/two-factor/components/two-factor-flow";
import { getVerifiedFactorId } from "@/features/two-factor/data/two-factor";
import { getPostLoginPath } from "@/lib/auth/redirects";
import { getSessionUser, isSecondFactorRequired } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Two-factor",
};

type TwoFactorPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

// Open to every role, outside the role areas: those redirect here, so it can't
// sit behind their gate.
export default async function TwoFactorPage({
  searchParams,
}: TwoFactorPageProps) {
  const user = await getSessionUser();
  if (!user) redirect(dashboards.patient.loginHref);

  const { next } = await searchParams;
  const nextPath = getPostLoginPath(
    user.role,
    typeof next === "string" ? next : null,
  );
  const required = isSecondFactorRequired(user.role);
  const factorId = await getVerifiedFactorId();

  return (
    <>
      <DashboardPageHeader
        title="Two-factor authentication"
        description={
          required
            ? "Your account opens only after this check."
            : "An extra check when you log in, on top of your password."
        }
      />
      <PanelCard title="Authenticator app" className="max-w-md">
        <div className="grid gap-5 p-5">
          <TwoFactorFlow
            factorId={factorId}
            passed={user.assuranceLevel === "aal2"}
            required={required}
            next={nextPath}
          />
        </div>
      </PanelCard>
    </>
  );
}
