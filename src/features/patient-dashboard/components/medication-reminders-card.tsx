import { PillIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";
import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { patientRoutes } from "@/config/routes";
import {
  describeDose,
  medicineName,
  type CurrentMedicine,
} from "@/features/prescriptions/lib/prescriptions";

type MedicationRemindersCardProps = {
  // Current medicines; the card shows the ones scheduled for today.
  medicines: CurrentMedicine[];
};

export function MedicationRemindersCard({
  medicines,
}: MedicationRemindersCardProps) {
  const today = medicines.filter(({ course }) => course.dueToday);

  return (
    <PanelCard
      title="Today's medicines"
      description={
        today.length === 0
          ? "Nothing scheduled today"
          : today.length === 1
            ? "1 medicine to take today"
            : `${today.length} medicines to take today`
      }
      action={
        <PanelLink href={patientRoutes.prescriptions}>View all</PanelLink>
      }
      className="h-fit"
    >
      {today.length > 0 ? (
        <ul className="divide-y">
          {today.map(({ item, course }) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
              <IconTile icon={PillIcon} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {medicineName(item)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {describeDose(item)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {course.daysLeft === null
                  ? "Ongoing"
                  : course.daysLeft === 1
                    ? "Last day"
                    : `${course.daysLeft} days left`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {medicines.length > 0
            ? "No doses scheduled for today. Medicines taken only when needed aren't listed here."
            : "No current medicines. Prescriptions from your doctors will show up here."}
        </p>
      )}
    </PanelCard>
  );
}
