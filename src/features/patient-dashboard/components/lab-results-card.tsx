import { FlaskConicalIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { StatusBadge } from "@/components/shared/status-badge";
import type { LabOrder } from "@/features/lab-tests/data/lab-orders";

type LabResultsCardProps = {
  orders: LabOrder[];
};

export function LabResultsCard({ orders }: LabResultsCardProps) {
  return (
    <PanelCard
      title="Lab tests"
      action={<PanelLink href="/patient/lab-tests">View all</PanelLink>}
    >
      <ul className="divide-y">
        {orders.map((order) => {
          const ready = order.stage === "Report ready";

          return (
            <li key={order.id} className="flex items-center gap-3 px-5 py-4">
              <IconTile
                icon={FlaskConicalIcon}
                size="sm"
                tone={ready ? "success" : "muted"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{order.testName}</p>
                <p className="text-xs text-muted-foreground">{order.lab}</p>
              </div>
              <StatusBadge tone={ready ? "success" : "warning"}>
                {order.stage}
              </StatusBadge>
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
