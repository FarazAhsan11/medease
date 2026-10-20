import { PillIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes } from "@/config/routes";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { PrescriptionStatusBadge } from "@/features/prescriptions/components/prescription-status-badge";
import {
  getPrescribeBlock,
  prescribeBlockMessages,
  type PrescriptionSummary,
} from "@/features/prescriptions/lib/prescriptions";

type AppointmentPrescriptionProps = {
  appointment: Appointment;
  // The active prescription, or else the latest cancelled one.
  prescription: PrescriptionSummary | null;
};

// The prescription part of the appointment details: what was prescribed,
// and the way to write or open it.
export function AppointmentPrescription({
  appointment,
  prescription,
}: AppointmentPrescriptionProps) {
  const block = getPrescribeBlock(appointment);
  // Nothing to show or do for a cancelled or no-show visit without one.
  if (!prescription && (block === "cancelled" || block === "no_show")) {
    return null;
  }

  const canWrite = block === null && prescription?.status !== "active";

  return (
    <div className="grid gap-2 border-t pt-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Prescription</p>
        {prescription && (
          <PrescriptionStatusBadge status={prescription.status} />
        )}
      </div>
      {prescription ? (
        <p className="text-sm text-muted-foreground">
          {prescription.medicines.join(", ")}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {block ? prescribeBlockMessages[block] : "No prescription yet."}
        </p>
      )}
      {(prescription || block === null) && (
        <Link
          href={doctorRoutes.prescription(appointment.id)}
          className={buttonVariants({
            size: "sm",
            variant: canWrite ? "default" : "outline",
            className: "w-fit gap-1.5",
          })}
        >
          <PillIcon aria-hidden />
          {canWrite ? "Write prescription" : "Open prescription"}
        </Link>
      )}
    </div>
  );
}
