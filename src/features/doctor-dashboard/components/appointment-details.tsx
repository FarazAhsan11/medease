import { MailIcon, PhoneIcon } from "lucide-react";

import { DetailList } from "@/components/shared/detail-list";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import {
  isUpcoming,
  needsOutcome,
  type Appointment,
} from "@/features/appointments/lib/appointments";
import { AppointmentNotesForm } from "@/features/doctor-dashboard/components/appointment-notes-form";
import { AppointmentOutcomeButtons } from "@/features/doctor-dashboard/components/appointment-outcome-buttons";
import { formatDate, formatDateTime, formatTime } from "@/lib/datetime";

type AppointmentDetailsProps = {
  appointment: Appointment;
  notes: string;
  // Completed visits with this patient, this one excluded.
  previousVisits: number;
};

export function AppointmentDetails({
  appointment,
  notes,
  previousVisits,
}: AppointmentDetailsProps) {
  const { timezone } = appointment;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <UserAvatar name={appointment.patientName} className="size-11" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{appointment.patientName}</p>
          <AppointmentStatusBadge appointment={appointment} viewer="doctor" />
        </div>
      </div>

      <div className="grid gap-1.5 text-sm">
        <a
          href={`mailto:${appointment.patientEmail}`}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <MailIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{appointment.patientEmail}</span>
        </a>
        {appointment.patientPhone && (
          <a
            href={`tel:${appointment.patientPhone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <PhoneIcon className="size-4 shrink-0" aria-hidden />
            {appointment.patientPhone}
          </a>
        )}
      </div>

      <DetailList
        items={[
          { label: "Date", value: formatDate(appointment.startsAt, timezone) },
          {
            label: "Time",
            value: `${formatTime(appointment.startsAt, timezone)} – ${formatTime(appointment.endsAt, timezone)}`,
          },
          {
            label: "Previous visits",
            value: previousVisits === 0 ? "First visit" : previousVisits,
          },
          {
            label: "Booked",
            value: formatDateTime(appointment.createdAt, timezone),
          },
        ]}
      />

      <div className="rounded-xl bg-muted p-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground">
          {appointment.status === "cancelled"
            ? "Cancellation reason"
            : "Reason for visit"}
        </p>
        <p className="mt-1">
          {(appointment.status === "cancelled"
            ? appointment.cancellationReason
            : appointment.reason) ?? "Not provided"}
        </p>
      </div>

      {appointment.status !== "cancelled" && (
        <div className="border-t pt-5">
          <AppointmentNotesForm appointmentId={appointment.id} notes={notes} />
        </div>
      )}

      {needsOutcome(appointment) && (
        <div className="grid gap-2 border-t pt-5">
          <p className="text-xs text-muted-foreground">
            How did this appointment go?
          </p>
          <AppointmentOutcomeButtons appointmentId={appointment.id} />
        </div>
      )}

      {isUpcoming(appointment) && (
        <div className="border-t pt-4">
          <CancelAppointmentDialog
            appointmentId={appointment.id}
            summary={`${appointment.patientName} on ${formatDateTime(appointment.startsAt, timezone)}`}
            notify="patient"
            triggerLabel="Cancel appointment"
          />
        </div>
      )}
    </div>
  );
}
