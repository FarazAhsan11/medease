import { ShieldCheckIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";

// Only doctors an admin has approved reach the directory, so every listed
// doctor has earned this.
export function VerifiedBadge({ licenseNumber }: { licenseNumber: string }) {
  return (
    <StatusBadge tone="success">
      <ShieldCheckIcon className="size-3" aria-hidden />
      PMDC verified · {licenseNumber}
    </StatusBadge>
  );
}
