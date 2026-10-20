import { ClockIcon, FileXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { CancelPrescriptionDialog } from "@/features/prescriptions/components/cancel-prescription-dialog";
import { PrescriptionAppointmentCard } from "@/features/prescriptions/components/prescription-appointment-card";
import { PrescriptionDocument } from "@/features/prescriptions/components/prescription-document";
import { PrescriptionEditor } from "@/features/prescriptions/components/prescription-editor";
import { PrescriptionForm } from "@/features/prescriptions/components/prescription-form";
import { PrescriptionSummaryCard } from "@/features/prescriptions/components/prescription-summary-card";
import { PrintButton } from "@/features/prescriptions/components/print-button";
import {
  getPrescribeBlock,
  prescribeBlockMessages,
  type Prescription,
} from "@/features/prescriptions/lib/prescriptions";

type PrescriptionWorkspaceProps = {
  appointment: Appointment;
  // The appointment's active and cancelled prescriptions, newest first.
  prescriptions: Prescription[];
};

// The doctor's prescription page for one appointment: write a new one, or
// view, edit, print or cancel the active one.
export function PrescriptionWorkspace({
  appointment,
  prescriptions,
}: PrescriptionWorkspaceProps) {
  const active = prescriptions.find((item) => item.status === "active");
  const cancelled = prescriptions.filter((item) => item.status === "cancelled");
  const block = getPrescribeBlock(appointment);

  return (
    <>
      <PrescriptionAppointmentCard appointment={appointment} />

      {active ? (
        <PrescriptionEditor
          prescription={active}
          canEdit={block === null}
          actions={
            <>
              <PrintButton />
              <CancelPrescriptionDialog
                prescriptionId={active.id}
                patientName={appointment.patientName}
              />
            </>
          }
        >
          {block === "window_closed" && (
            <p className="text-xs text-muted-foreground print:hidden">
              {prescribeBlockMessages.window_closed} You can still cancel it.
            </p>
          )}
          <PrescriptionDocument prescription={active} viewer="doctor" />
        </PrescriptionEditor>
      ) : block ? (
        <EmptyState
          icon={block === "not_started" ? ClockIcon : FileXIcon}
          title={
            block === "not_started"
              ? "Not yet"
              : "This appointment can't have a prescription"
          }
          description={prescribeBlockMessages[block]}
        />
      ) : (
        <PrescriptionForm appointmentId={appointment.id} existing={null} />
      )}

      {cancelled.length > 0 && (
        <section className="grid gap-3 print:hidden">
          <h2 className="text-base font-semibold">Cancelled prescriptions</h2>
          {cancelled.map((prescription) => (
            <PrescriptionSummaryCard
              key={prescription.id}
              prescription={prescription}
            />
          ))}
        </section>
      )}
    </>
  );
}
