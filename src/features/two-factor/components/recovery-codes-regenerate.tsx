"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { regenerateRecoveryCodes } from "@/features/two-factor/actions/two-factor";
import { RecoveryCodesPanel } from "@/features/two-factor/components/recovery-codes-panel";
import type { RecoveryCodesState } from "@/features/two-factor/schemas/two-factor";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function RecoveryCodesRegenerate() {
  const { state, pending, onSubmit } = useFormAction<RecoveryCodesState>(
    regenerateRecoveryCodes,
    initialFormState,
  );

  if (state.recoveryCodes) {
    return <RecoveryCodesPanel codes={state.recoveryCodes} />;
  }

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        Used some, or lost them? New codes replace all your old ones.
      </p>
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="w-fit gap-2"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Creating…" : "Create new recovery codes"}
      </Button>
    </form>
  );
}
