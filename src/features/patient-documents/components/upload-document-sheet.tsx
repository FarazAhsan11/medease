"use client";

import { Loader2Icon, UploadIcon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DOCUMENT_ACCEPT,
  documentKindLabels,
  MAX_DOCUMENT_MB,
  MAX_DOCUMENT_TITLE,
  patientDocumentKinds,
} from "@/features/patient-documents/lib/document-rules";
import { uploadPatientDocument } from "@/features/patient-documents/lib/upload-patient-document";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

const id = (field: string) => `document-${field}`;

export function UploadDocumentSheet() {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    uploadPatientDocument,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button size="sm" variant="outline" className="gap-1.5" />}
      >
        <UploadIcon aria-hidden />
        Upload
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Upload a document</SheetTitle>
          <SheetDescription>Only you can see your documents.</SheetDescription>
        </SheetHeader>
        <form
          method="post"
          onSubmit={onSubmit}
          className="grid gap-4 px-4 pb-6"
          noValidate
        >
          <FormField
            id={id("file")}
            label="File"
            hint={`PDF, JPG or PNG, up to ${MAX_DOCUMENT_MB} MB`}
            error={fieldError("file")}
          >
            <Input
              id={id("file")}
              name="file"
              type="file"
              accept={DOCUMENT_ACCEPT}
              {...fieldErrorProps(id("file"), fieldError("file"))}
            />
          </FormField>
          <FormField id={id("title")} label="Name" error={fieldError("title")}>
            <Input
              id={id("title")}
              name="title"
              maxLength={MAX_DOCUMENT_TITLE}
              placeholder="e.g. Complete blood count"
              {...fieldErrorProps(id("title"), fieldError("title"))}
            />
          </FormField>
          <FormField id={id("kind")} label="Type" error={fieldError("kind")}>
            <NativeSelect
              id={id("kind")}
              name="kind"
              defaultValue="lab_report"
              className="w-full"
              {...fieldErrorProps(id("kind"), fieldError("kind"))}
            >
              {patientDocumentKinds.map((kind) => (
                <NativeSelectOption key={kind} value={kind}>
                  {documentKindLabels[kind]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id={id("date")}
            label="Date on the document (optional)"
            error={fieldError("documentOn")}
          >
            <Input
              id={id("date")}
              name="documentOn"
              type="date"
              min="1900-01-01"
              {...fieldErrorProps(id("date"), fieldError("documentOn"))}
            />
          </FormField>
          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              {pending ? "Uploading…" : "Upload document"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
