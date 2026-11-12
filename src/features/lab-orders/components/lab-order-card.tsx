import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { BookedForBadge } from "@/features/family/components/booked-for-badge";
import { LabOrderBadge } from "@/features/lab-orders/components/lab-order-badge";
import { LabOrderTests } from "@/features/lab-orders/components/lab-order-tests";
import type { LabOrderWithVisit } from "@/features/lab-orders/data/lab-orders";
import { formatDate } from "@/lib/datetime";

type LabOrderCardProps = {
  order: LabOrderWithVisit;
  // Off on the order's own page, where the labs are listed below.
  showBookLink?: boolean;
};

// A doctor's order for the patient: who ordered it, when, for whom, and what.
export function LabOrderCard({
  order,
  showBookLink = true,
}: LabOrderCardProps) {
  const { visit } = order;

  return (
    <article className="grid gap-3 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <FlaskConicalIcon
              className="size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span className="break-words">Ordered by {visit.doctorName}</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            At your visit on {formatDate(visit.startsAt, visit.timezone)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <BookedForBadge {...visit} />
          <LabOrderBadge order={order} />
        </div>
      </div>
      <LabOrderTests order={order} />
      {showBookLink && order.status === "active" && (
        <Link
          href={patientRoutes.labOrder(order.id)}
          className={buttonVariants({ size: "sm", className: "w-fit" })}
        >
          Book these tests
        </Link>
      )}
    </article>
  );
}
