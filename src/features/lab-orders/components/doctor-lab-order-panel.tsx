import { PanelCard } from "@/components/shared/panel-card";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { bookedByLabel } from "@/features/family/lib/relations";
import { CancelLabOrderDialog } from "@/features/lab-orders/components/cancel-lab-order-dialog";
import { LabOrderBadge } from "@/features/lab-orders/components/lab-order-badge";
import { LabOrderForm } from "@/features/lab-orders/components/lab-order-form";
import { LabOrderTests } from "@/features/lab-orders/components/lab-order-tests";
import {
  getLabOrderBlock,
  labOrderBlockMessages,
  type LabOrder,
  type LabOrderTest,
} from "@/features/lab-orders/lib/lab-orders";
import { formatDateTime } from "@/lib/datetime";

type DoctorLabOrderPanelProps = {
  appointment: Appointment;
  order: LabOrder | null;
  tests: LabOrderTest[];
};

// The order form while the visit is in its window; otherwise what was ordered
// and why it can't change. A cancel is possible at any time.
export function DoctorLabOrderPanel({
  appointment,
  order,
  tests,
}: DoctorLabOrderPanelProps) {
  const block = getLabOrderBlock(appointment);
  const active = order?.status === "active";
  const bookedBy = bookedByLabel(appointment);

  return (
    <PanelCard
      title={appointment.careRecipientName}
      description={[
        bookedBy,
        formatDateTime(appointment.startsAt, appointment.timezone),
      ]
        .filter(Boolean)
        .join(" · ")}
      action={order && <LabOrderBadge order={order} />}
      className="max-w-2xl"
    >
      <div className="grid gap-5 p-5">
        {block === null ? (
          <LabOrderForm
            // Start again from the saved order after a save or cancel.
            key={order?.updatedAt ?? "new"}
            appointmentId={appointment.id}
            tests={tests}
            order={order}
          />
        ) : (
          <>
            {order && <LabOrderTests order={order} />}
            <p className="text-sm text-muted-foreground">
              {labOrderBlockMessages[block]}
            </p>
          </>
        )}
        {active && (
          <div className="border-t pt-5">
            <CancelLabOrderDialog appointmentId={appointment.id} />
          </div>
        )}
      </div>
    </PanelCard>
  );
}
