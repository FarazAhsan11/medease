"use client";

import { Loader2Icon } from "lucide-react";
import { useRef } from "react";

import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { DoctorDocumentFields } from "@/features/doctor-verification/components/doctor-document-fields";
import { uploadDocuments } from "@/features/doctor-verification/lib/upload-documents";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function VerificationDocumentsForm() {
  const form = useRef<HTMLFormElement>(null);
  const { pending, onSubmit, fieldError } = useFormAction(
    uploadDocuments,
    initialFormState,
    { onSuccess: () => form.current?.reset() },
  );

  return (
    <PanelCard
      title="Upload documents"
      description="Choose the files you want to add or replace."
    >
      <form
        ref={form}
        onSubmit={onSubmit}
        className="grid gap-4 p-5"
        noValidate
      >
        <DoctorDocumentFields idPrefix="verification" fieldError={fieldError} />
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={pending} className="gap-2">
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {pending ? "Uploading…" : "Save documents"}
          </Button>
        </div>
      </form>
    </PanelCard>
  );
}
