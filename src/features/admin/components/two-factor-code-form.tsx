"use client";

import { Loader2Icon } from "lucide-react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyTwoFactor } from "@/features/admin/actions/two-factor";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function TwoFactorCodeForm({ factorId }: { factorId: string }) {
  const { pending, onSubmit, fieldError } = useFormAction(
    verifyTwoFactor,
    initialFormState,
  );
  const error = fieldError("code");

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="factorId" value={factorId} />
      <FormField id="two-factor-code" label="6-digit code" error={error}>
        <Input
          id="two-factor-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          {...fieldErrorProps("two-factor-code", error)}
        />
      </FormField>
      <Button type="submit" disabled={pending} className="gap-2">
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Checking…" : "Verify"}
      </Button>
    </form>
  );
}
