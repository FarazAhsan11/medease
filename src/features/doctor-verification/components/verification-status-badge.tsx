import { StatusBadge } from "@/components/shared/status-badge";
import {
  verificationBadges,
  type VerificationStatus,
} from "@/features/doctor-verification/lib/verification";

export function VerificationStatusBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  const { label, tone } = verificationBadges[status];

  return (
    <StatusBadge tone={tone} dot>
      {label}
    </StatusBadge>
  );
}
