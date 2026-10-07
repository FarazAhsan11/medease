import { PillIcon, RefreshCwIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DoseSchedule } from "@/features/prescriptions/components/dose-schedule";
import type { Prescription } from "@/features/prescriptions/data/prescriptions";

type PrescriptionCardProps = {
  prescription: Prescription;
};

const REFILL_WARNING_DAYS = 5;

export function PrescriptionCard({ prescription }: PrescriptionCardProps) {
  const runningLow = prescription.daysRemaining <= REFILL_WARNING_DAYS;

  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <IconTile icon={PillIcon} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            {prescription.medicine} {prescription.strength}
          </h3>
          <p className="text-xs text-muted-foreground">
            {prescription.instructions}
          </p>
        </div>
        {runningLow && <StatusBadge tone="warning">Refill soon</StatusBadge>}
      </div>

      <div className="mt-4">
        <DoseSchedule doses={prescription.doses} />
      </div>

      <div className="mt-4 grid gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Supply remaining</span>
          <span className="font-medium">{prescription.daysRemaining} days</span>
        </div>
        <Progress
          value={Math.min(100, (prescription.daysRemaining / 30) * 100)}
          aria-label="Supply remaining"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {prescription.prescribedBy}
          <br />
          {prescription.refillsLeft} of {prescription.totalRefills} refills left
        </p>
        <Button
          size="sm"
          variant={runningLow ? "default" : "outline"}
          disabled={prescription.refillsLeft === 0}
          className="gap-1.5"
        >
          <RefreshCwIcon aria-hidden />
          Request refill
        </Button>
      </div>
    </article>
  );
}
