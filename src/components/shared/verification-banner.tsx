import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";

import { IconTile } from "@/components/shared/icon-tile";
import { VerificationStatusBadge } from "@/components/shared/verification-status-badge";
import { buttonVariants } from "@/components/ui/button";
import type { VerificationStatus } from "@/lib/verification";

type VerificationBannerProps = {
  status: VerificationStatus;
  title: string;
  // What each status means for this kind of account.
  descriptions: Record<Exclude<VerificationStatus, "approved">, string>;
  href: string;
};

// Only doctors and labs that aren't live yet see this.
export function VerificationBanner({
  status,
  title,
  descriptions,
  href,
}: VerificationBannerProps) {
  if (status === "approved") return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
      <IconTile icon={ShieldAlertIcon} tone="warning" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          <VerificationStatusBadge status={status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {descriptions[status]}
        </p>
      </div>
      <Link
        href={href}
        className={buttonVariants({ variant: "outline", className: "h-9" })}
      >
        View status
      </Link>
    </section>
  );
}
