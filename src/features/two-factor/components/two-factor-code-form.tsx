"use client";

import { Loader2Icon } from "lucide-react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyTwoFactor } from "@/features/two-factor/actions/two-factor";
import type { RecoveryCodesState } from "@/features/two-factor/schemas/two-factor";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type TwoFactorCodeFormProps = {
  factorId: string;
  next?: string;
  // Called with the recovery codes when this code finishes pairing an app.
  onPaired?: (codes: string[]) => void;
};

export function TwoFactorCodeForm({
  factorId,
  next,
  onPaired,
}: TwoFactorCodeFormProps) {
  const { pending, onSubmit, fieldError } = useFormAction<RecoveryCodesState>(
    verifyTwoFactor,
    initialFormState,
    {
      onSuccess: ({ recoveryCodes }) => {
        if (recoveryCodes) onPaired?.(recoveryCodes);
      },
    },
  );
  const error = fieldError("code");

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="factorId" value={factorId} />
      {next && <input type="hidden" name="next" value={next} />}
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
