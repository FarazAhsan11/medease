import Link from "next/link";

import { PanelCard } from "@/components/shared/panel-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes, twoFactorRoute } from "@/config/routes";

export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  return (
    <PanelCard
      title="Two-factor authentication"
      description="A code from your phone, on top of your password."
      action={
        <StatusBadge tone={enabled ? "success" : "muted"}>
          {enabled ? "On" : "Off"}
        </StatusBadge>
      }
    >
      <div className="p-5">
        <Link
          href={`${twoFactorRoute}?next=${encodeURIComponent(patientRoutes.settings)}`}
          className={buttonVariants({ variant: "outline" })}
        >
          {enabled ? "Manage" : "Turn on"}
        </Link>
      </div>
    </PanelCard>
  );
}
