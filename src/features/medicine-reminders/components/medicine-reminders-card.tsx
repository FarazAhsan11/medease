import { PanelCard } from "@/components/shared/panel-card";
import { StatusBadge } from "@/components/shared/status-badge";

import {
  timezoneOptions,
  type MedicineReminderSettings,
} from "../lib/medicine-reminders";
import { MedicineRemindersForm } from "./medicine-reminders-form";

export function MedicineRemindersCard({
  settings,
}: {
  settings: MedicineReminderSettings;
}) {
  return (
    <PanelCard
      title="Medicine reminders"
      description="Emails arrive within 15 minutes of each time. They never name your medicines."
      action={
        <StatusBadge tone={settings.enabled ? "success" : "muted"}>
          {settings.enabled ? "On" : "Off"}
        </StatusBadge>
      }
    >
      <MedicineRemindersForm
        settings={settings}
        timezones={timezoneOptions(settings.timezone)}
      />
    </PanelCard>
  );
}
