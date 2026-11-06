import { StatusBadge } from "@/components/shared/status-badge";
import {
  bookedForLabel,
  type CareRecipientRelation,
} from "@/features/family/lib/relations";

type BookedForBadgeProps = {
  patientName: string;
  careRecipientName: string;
  careRecipientRelation: CareRecipientRelation;
};

// On the account holder's lists: marks a visit or prescription that is for a
// family member. Renders nothing for their own.
export function BookedForBadge(props: BookedForBadgeProps) {
  const label = bookedForLabel(props);
  return label && <StatusBadge tone="muted">{label}</StatusBadge>;
}
