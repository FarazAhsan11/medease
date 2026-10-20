import { PillIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import { PanelLink } from "@/components/shared/panel-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { patientRoutes } from "@/config/routes";
import { DoseSchedule } from "@/features/prescriptions/components/dose-schedule";
import {
  ENDING_SOON_DAYS,
  describeDose,
  medicineFormLabels,
  medicineName,
  type CurrentMedicine,
} from "@/features/prescriptions/lib/prescriptions";
import { formatDate, formatDateKey } from "@/lib/datetime";

type CurrentMedicineCardProps = {
  medicine: CurrentMedicine;
};

export function CurrentMedicineCard({ medicine }: CurrentMedicineCardProps) {
  const { prescription, item, course } = medicine;
  const endingSoon =
    course.daysLeft !== null && course.daysLeft <= ENDING_SOON_DAYS;

  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <IconTile icon={PillIcon} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{medicineName(item)}</h3>
          <p className="text-xs text-muted-foreground">
            {medicineFormLabels[item.form]} · {describeDose(item)}
          </p>
        </div>
        {endingSoon && <StatusBadge tone="warning">Ending soon</StatusBadge>}
      </div>

      <div className="mt-4">
        {item.frequency === "as_needed" ? (
          <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground">
            Take only when needed
          </p>
        ) : (
          <DoseSchedule doses={item.doseTimes} />
        )}
      </div>

      {item.instructions && (
        <p className="mt-3 text-xs text-muted-foreground">
          {item.instructions}
        </p>
      )}

      <div className="mt-4 grid gap-1.5">
        {course.daysLeft !== null && item.durationDays !== null ? (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Until {formatDateKey(course.endKey ?? course.startKey)}
              </span>
              <span className="font-medium">
                {course.daysLeft === 1
                  ? "Last day"
                  : `${course.daysLeft} days left`}
              </span>
            </div>
            <Progress
              value={Math.min(100, (course.daysLeft / item.durationDays) * 100)}
              aria-label="Course remaining"
            />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ongoing. Keep taking it until your doctor tells you to stop.
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {prescription.doctorName}
          <br />
          {formatDate(prescription.issuedAt, prescription.timezone)}
        </p>
        <PanelLink href={patientRoutes.prescription(prescription.id)}>
          View prescription
        </PanelLink>
      </div>
    </article>
  );
}
