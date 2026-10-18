import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import {
  isInProgress,
  needsOutcome,
  type Appointment,
} from "@/features/appointments/lib/appointments";

type AppointmentStatusBadgeProps = {
  appointment: Appointment;
  // Wording for cancellations depends on who is looking.
  viewer: "patient" | "doctor";
};

export function AppointmentStatusBadge({
  appointment,
  viewer,
}: AppointmentStatusBadgeProps) {
  const [tone, label] = describe(appointment, viewer);
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

function describe(
  appointment: Appointment,
  viewer: "patient" | "doctor",
): [StatusTone, string] {
  switch (appointment.status) {
    case "completed":
      return ["success", "Completed"];
    case "no_show":
      return ["warning", "No-show"];
    case "cancelled":
      return [
        "danger",
        appointment.cancelledBy === viewer
          ? "Cancelled by you"
          : `Cancelled by ${appointment.cancelledBy === "doctor" ? "doctor" : "patient"}`,
      ];
    default:
      if (isInProgress(appointment)) return ["success", "Happening now"];
      return needsOutcome(appointment)
        ? ["muted", viewer === "doctor" ? "Needs outcome" : "Awaiting update"]
        : ["info", "Confirmed"];
  }
}
