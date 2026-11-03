"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemRecoveryCode } from "@/features/two-factor/actions/two-factor";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

// Starts folded away: most people are here for their 6-digit code.
export function RecoveryCodeForm() {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit, fieldError } = useFormAction(
    redeemRecoveryCode,
    initialFormState,
  );
  const error = fieldError("code");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="justify-self-start text-sm font-medium text-primary hover:underline"
      >
        Lost your phone? Use a recovery code
      </button>
    );
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="grid gap-4 border-t pt-4"
      noValidate
    >
      <FormField
        id="recovery-code"
        label="Recovery code"
        hint="This removes your old authenticator, and you'll log in again to set up a new one."
        error={error}
      >
        <Input
          id="recovery-code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          {...fieldErrorProps("recovery-code", error)}
        />
      </FormField>
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="gap-2"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Checking…" : "Use recovery code"}
      </Button>
      <p className="text-xs text-muted-foreground">
        No codes left?{" "}
        <Link href="/contact" className="text-primary hover:underline">
          Contact support
        </Link>
        .
      </p>
    </form>
  );
}
