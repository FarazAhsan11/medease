import { PanelCard } from "@/components/shared/panel-card";
import { SettingRow } from "@/components/shared/setting-row";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DashboardRole } from "@/config/dashboards";

import {
  emailSettings,
  isEmailOn,
  type EmailPreferences,
} from "../lib/notification-preferences";
import { EmailPreferencesForm } from "./email-preferences-form";

type EmailPreferencesCardProps = {
  role: DashboardRole;
  preferences: EmailPreferences;
  className?: string;
};

export function EmailPreferencesCard({
  role,
  preferences,
  className,
}: EmailPreferencesCardProps) {
  const settings = emailSettings[role];
  if (!settings) return null;

  return (
    <PanelCard
      className={className}
      title="Email notifications"
      description="Every update also shows under the bell. Emails link to the app and carry no health details."
    >
      <div className="grid gap-3 p-5">
        <EmailPreferencesForm
          settings={settings.optional.map((setting) => ({
            ...setting,
            on: isEmailOn(preferences, setting.id),
          }))}
        />
        <div className="grid gap-3 border-t pt-4">
          {settings.required.map(({ label, description }) => (
            <SettingRow key={label} label={label} description={description}>
              <StatusBadge tone="muted">Always on</StatusBadge>
            </SettingRow>
          ))}
        </div>
      </div>
    </PanelCard>
  );
}
