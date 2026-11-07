"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { SettingRow } from "@/components/shared/setting-row";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

import { saveEmailPreferences } from "../actions/save-notification-preferences";
import type { OptionalEmailSetting } from "../lib/notification-preferences";

type EmailPreferencesFormProps = {
  settings: (OptionalEmailSetting & { on: boolean })[];
};

export function EmailPreferencesForm({ settings }: EmailPreferencesFormProps) {
  // The switches own their values once mounted. Saving refreshes the page with
  // the same values, and uncontrolled fields can't take new defaults.
  const [initial] = useState(settings);
  const { pending, onSubmit } = useFormAction(
    saveEmailPreferences,
    initialFormState,
  );

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-3" noValidate>
      {initial.map(({ id, label, description, on }) => {
        const inputId = `email-setting-${id}`;
        return (
          <SettingRow
            key={id}
            label={label}
            description={description}
            htmlFor={inputId}
          >
            <Switch id={inputId} name={id} defaultChecked={on} />
          </SettingRow>
        );
      })}

      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="w-fit gap-2"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save email settings"}
      </Button>
    </form>
  );
}
