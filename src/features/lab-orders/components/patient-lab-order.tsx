import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { LabOrderBadge } from "@/features/lab-orders/components/lab-order-badge";
import { LabOrderTests } from "@/features/lab-orders/components/lab-order-tests";
import type { LabOrder } from "@/features/lab-orders/lib/lab-orders";

// The tests the doctor ordered, under a visit on the patient's appointments.
export function PatientLabOrder({ order }: { order: LabOrder }) {
  const active = order.status === "active";

  return (
    <section className="grid gap-3 rounded-xl bg-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <FlaskConicalIcon className="size-4 text-primary" aria-hidden />
          Lab tests ordered
        </h4>
        <LabOrderBadge order={order} />
      </div>
      <LabOrderTests order={order} />
      {active ? (
        <Link
          href={patientRoutes.labOrder(order.id)}
          className={buttonVariants({ size: "sm", className: "w-fit gap-1.5" })}
        >
          Book these tests
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your doctor cancelled this order, so there&apos;s nothing to book.
        </p>
      )}
    </section>
  );
}
