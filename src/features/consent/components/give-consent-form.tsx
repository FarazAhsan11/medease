"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

import { giveTelemedicineConsent } from "../actions/consents";
import { TELEMEDICINE_CONSENT } from "../lib/consent-documents";
import { ConsentFields } from "./consent-fields";

export function GiveConsentForm() {
  const { pending, onSubmit, fieldError } = useFormAction(
    giveTelemedicineConsent,
    initialFormState,
  );

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      <ConsentFields
        idPrefix="settings"
        documents={[TELEMEDICINE_CONSENT]}
        fieldError={fieldError}
      />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="w-fit gap-2"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Give consent"}
      </Button>
    </form>
  );
}
