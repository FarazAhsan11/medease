import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { PanelCard } from "@/components/shared/panel-card";
import { TwoFactorCodeForm } from "@/features/admin/components/two-factor-code-form";
import { TwoFactorSetup } from "@/features/admin/components/two-factor-setup";
import { getVerifiedFactorId } from "@/features/admin/data/two-factor";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Two-factor",
};

export default async function AdminTwoFactorPage() {
  const user = await requireRole("admin");
  const factorId = await getVerifiedFactorId();
  const passed = user.assuranceLevel === "aal2";

  return (
    <>
      <DashboardPageHeader
        title="Two-factor authentication"
        description="Admin pages open only after this check."
      />
      <PanelCard title="Authenticator app" className="max-w-md">
        <div className="p-5">
          {passed ? (
            <p className="text-sm text-muted-foreground">
              Two-factor is on, and this session has passed the check.
            </p>
          ) : factorId ? (
            <TwoFactorCodeForm factorId={factorId} />
          ) : (
            <TwoFactorSetup />
          )}
        </div>
      </PanelCard>
    </>
  );
}
