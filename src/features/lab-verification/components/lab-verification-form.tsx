"use client";

import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { LabVerification } from "@/features/lab-verification/data/lab-verification";
import {
  licenseRule,
  licensingAuthorities,
  licensingAuthorityKeys,
} from "@/features/lab-verification/lib/lab-verification";
import { submitLabVerification } from "@/features/lab-verification/lib/submit-lab-verification";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function LabVerificationForm({
  verification,
}: {
  verification: LabVerification;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  // The fields are uncontrolled: keep their first values, so the refresh
  // after a save doesn't change a default value under them.
  const [initial] = useState(verification);
  const { pending, onSubmit, fieldError } = useFormAction(
    submitLabVerification,
    initialFormState,
    {
      onSuccess: () => {
        if (fileInput.current) fileInput.current.value = "";
      },
    },
  );
  const errors = {
    registrationNumber: fieldError("registrationNumber"),
    licensingAuthority: fieldError("licensingAuthority"),
    address: fieldError("address"),
    licenseDocument: fieldError("licenseDocument"),
  };

  return (
    <PanelCard
      title="Licence details"
      description="What our team checks with the healthcare commission."
    >
      <form
        method="post"
        onSubmit={onSubmit}
        className="grid gap-4 p-5"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="lab-licensing-authority"
            label="Licensed by"
            error={errors.licensingAuthority}
          >
            <NativeSelect
              id="lab-licensing-authority"
              name="licensingAuthority"
              defaultValue={initial.licensingAuthority ?? ""}
              className="w-full"
              {...fieldErrorProps(
                "lab-licensing-authority",
                errors.licensingAuthority,
              )}
            >
              <NativeSelectOption value="" disabled>
                Choose an authority
              </NativeSelectOption>
              {licensingAuthorityKeys.map((key) => (
                <NativeSelectOption key={key} value={key}>
                  {licensingAuthorities[key]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id="lab-registration-number"
            label="Licence or registration number"
            error={errors.registrationNumber}
          >
            <Input
              id="lab-registration-number"
              name="registrationNumber"
              defaultValue={initial.registrationNumber}
              maxLength={40}
              required
              {...fieldErrorProps(
                "lab-registration-number",
                errors.registrationNumber,
              )}
            />
          </FormField>
          <FormField
            id="lab-address"
            label="Address on the licence"
            error={errors.address}
            className="sm:col-span-2"
          >
            <Textarea
              id="lab-address"
              name="address"
              rows={2}
              defaultValue={initial.address}
              maxLength={300}
              required
              {...fieldErrorProps("lab-address", errors.address)}
            />
          </FormField>
          <FormField
            id="lab-license-document"
            label={verification.hasLicense ? "Replace licence" : "Licence"}
            hint={`PDF, JPG or PNG, up to ${licenseRule.maxMb} MB`}
            error={errors.licenseDocument}
            className="sm:col-span-2"
          >
            <Input
              ref={fileInput}
              id="lab-license-document"
              name="licenseDocument"
              type="file"
              accept={Object.keys(licenseRule.types).join(",")}
              {...fieldErrorProps(
                "lab-license-document",
                errors.licenseDocument,
              )}
            />
          </FormField>
        </div>
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={pending} className="gap-2">
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {pending ? "Sending…" : "Send for review"}
          </Button>
        </div>
      </form>
    </PanelCard>
  );
}
