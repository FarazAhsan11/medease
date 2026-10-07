import { CalendarIcon, DownloadIcon, HouseIcon } from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { OrderTracker } from "@/features/lab-tests/components/order-tracker";
import type {
  LabOrder,
  OrderStage,
} from "@/features/lab-tests/data/lab-orders";
import { formatFee } from "@/lib/format";

const stageTones: Record<OrderStage, StatusTone> = {
  Booked: "info",
  "Sample collected": "info",
  Processing: "warning",
  "Report ready": "success",
};

type LabOrderCardProps = {
  order: LabOrder;
};

export function LabOrderCard({ order }: LabOrderCardProps) {
  const ready = order.stage === "Report ready";

  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{order.testName}</h3>
            <StatusBadge tone={stageTones[order.stage]} dot>
              {order.stage}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {order.id} · {order.lab}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" aria-hidden />
              {order.scheduledFor}
            </li>
            <li className="flex items-center gap-1.5">
              <HouseIcon className="size-3.5" aria-hidden />
              {order.collection}
            </li>
            <li className="font-medium text-foreground">
              {formatFee(order.price)}
            </li>
          </ul>
        </div>
        <Button
          size="sm"
          variant={ready ? "default" : "outline"}
          disabled={!ready}
          className="gap-1.5 self-start"
        >
          <DownloadIcon aria-hidden />
          {ready ? "Download report" : "Report pending"}
        </Button>
      </div>
      <div className="mt-5 border-t pt-5">
        <OrderTracker stage={order.stage} />
      </div>
    </article>
  );
}
