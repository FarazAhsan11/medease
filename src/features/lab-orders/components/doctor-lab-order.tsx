import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes } from "@/config/routes";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { LabOrderBadge } from "@/features/lab-orders/components/lab-order-badge";
import { LabOrderTests } from "@/features/lab-orders/components/lab-order-tests";
import {
  getLabOrderBlock,
  labOrderBlockMessages,
  type LabOrder,
} from "@/features/lab-orders/lib/lab-orders";

type DoctorLabOrderProps = {
  appointment: Appointment;
  order: LabOrder | null;
};

// The lab tests part of the appointment details: what was ordered, and the
// way to order or change it.
export function DoctorLabOrder({ appointment, order }: DoctorLabOrderProps) {
  const block = getLabOrderBlock(appointment);
  if (!order && (block === "cancelled" || block === "no_show")) return null;

  const active = order?.status === "active";

  return (
    <div className="grid gap-2 border-t pt-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Lab tests</p>
        {order && <LabOrderBadge order={order} />}
      </div>
      {order ? (
        <LabOrderTests order={order} />
      ) : (
        <p className="text-xs text-muted-foreground">
          {block ? labOrderBlockMessages[block] : "No lab tests ordered."}
        </p>
      )}
      {(order || block === null) && (
        <Link
          href={doctorRoutes.labOrder(appointment.id)}
          className={buttonVariants({
            size: "sm",
            variant: active || block !== null ? "outline" : "default",
            className: "w-fit gap-1.5",
          })}
        >
          <FlaskConicalIcon aria-hidden />
          {block !== null
            ? "Open lab tests"
            : active
              ? "Change lab tests"
              : "Order lab tests"}
        </Link>
      )}
    </div>
  );
}
