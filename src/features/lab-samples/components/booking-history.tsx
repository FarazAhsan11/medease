import {
  reasonLabels,
  statusLabels,
  type LabBookingStatus,
  type StatusReason,
} from "@/features/lab-booking/lib/lab-bookings";
import type { BookingHistoryStep } from "@/features/lab-samples/lib/samples";
import { labRoleLabels } from "@/features/lab-staff/lib/lab-permissions";
import { formatDateKey, formatDateTime } from "@/lib/datetime";

type BookingHistoryProps = {
  steps: BookingHistoryStep[];
  timezone: string;
};

// Every step of a booking, oldest first, with who took it and when.
export function BookingHistory({ steps, timezone }: BookingHistoryProps) {
  return (
    <ol className="grid gap-4 border-l pl-5">
      {steps.map((step, index) => (
        <li key={index} className="relative text-sm">
          <span
            className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-primary"
            aria-hidden
          />
          <p className="font-medium">{stepTitle(step, timezone)}</p>
          {step.reason && (
            <p className="text-muted-foreground">
              {reasonLabels[step.reason as StatusReason] ?? step.reason}
              {step.note && `: ${step.note}`}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {actorLabel(step)} · {formatDateTime(step.created_at, timezone)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function stepTitle(step: BookingHistoryStep, timezone: string) {
  if (step.kind === "rescheduled") {
    const when = step.slot_starts_at
      ? formatDateTime(step.slot_starts_at, timezone)
      : step.visit_date
        ? formatDateKey(step.visit_date)
        : null;
    return when ? `Moved to ${when}` : "Moved to a new time";
  }
  return statusLabels[step.status as LabBookingStatus] ?? step.status;
}

function actorLabel(step: BookingHistoryStep) {
  switch (step.actor) {
    case "patient":
      return "The patient";
    case "staff": {
      if (!step.actor_name) return "A former staff member";
      return step.actor_role
        ? `${step.actor_name}, ${labRoleLabels[step.actor_role].toLowerCase()}`
        : step.actor_name;
    }
    default:
      return "MedEase";
  }
}
