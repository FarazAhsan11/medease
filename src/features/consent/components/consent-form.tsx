"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

import { acceptConsents } from "../actions/consents";
import type { ConsentDocument } from "../lib/consent-documents";
import { ConsentFields } from "./consent-fields";

export function ConsentForm({
  documents,
}: {
  documents: readonly ConsentDocument[];
}) {
  const { pending, onSubmit, fieldError } = useFormAction(
    acceptConsents,
    initialFormState,
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <ConsentFields
        idPrefix="accept"
        documents={documents}
        fieldError={fieldError}
      />
      <Button type="submit" disabled={pending} className="w-fit gap-2">
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Agree and continue"}
      </Button>
    </form>
  );
}
