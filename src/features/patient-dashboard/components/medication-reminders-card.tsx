import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { Checkbox } from "@/components/ui/checkbox";
import type { Prescription } from "@/features/prescriptions/data/prescriptions";

type MedicationRemindersCardProps = {
  prescriptions: Prescription[];
};

export function MedicationRemindersCard({
  prescriptions,
}: MedicationRemindersCardProps) {
  const reminders = prescriptions.flatMap((prescription) =>
    prescription.doses.map((dose) => ({
      id: `${prescription.id}-${dose}`,
      dose,
      name: `${prescription.medicine} ${prescription.strength}`,
      instructions: prescription.instructions,
    })),
  );

  return (
    <PanelCard
      title="Today's medicines"
      description={`${reminders.length} doses scheduled`}
      action={<PanelLink href="/patient/prescriptions">Manage</PanelLink>}
    >
      <ul className="divide-y">
        {reminders.map((reminder) => (
          <li key={reminder.id}>
            <label className="flex cursor-pointer items-center gap-3 px-5 py-3.5 hover:bg-muted/50">
              <Checkbox aria-label={`Mark ${reminder.name} as taken`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {reminder.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {reminder.instructions}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {reminder.dose}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
