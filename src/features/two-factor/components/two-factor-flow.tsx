"use client";

import { useState } from "react";

import { DisableTwoFactorDialog } from "@/features/two-factor/components/disable-two-factor-dialog";
import { RecoveryCodeForm } from "@/features/two-factor/components/recovery-code-form";
import { RecoveryCodesPanel } from "@/features/two-factor/components/recovery-codes-panel";
import { RecoveryCodesRegenerate } from "@/features/two-factor/components/recovery-codes-regenerate";
import { TwoFactorCodeForm } from "@/features/two-factor/components/two-factor-code-form";
import { TwoFactorSetup } from "@/features/two-factor/components/two-factor-setup";

type TwoFactorFlowProps = {
  factorId: string | null;
  passed: boolean;
  required: boolean;
  next: string;
};

// Holds the recovery codes here, above the steps. Finishing pairing changes the
// session cookies, which refreshes the page and flips these props to "already
// on"; the step that received the codes would unmount and take them with it, and
// they can't be shown a second time.
export function TwoFactorFlow({
  factorId,
  passed,
  required,
  next,
}: TwoFactorFlowProps) {
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  if (recoveryCodes) {
    return <RecoveryCodesPanel codes={recoveryCodes} continueHref={next} />;
  }

  if (!factorId) {
    return <TwoFactorSetup required={required} onPaired={setRecoveryCodes} />;
  }

  if (!passed) {
    return (
      <>
        <TwoFactorCodeForm factorId={factorId} next={next} />
        <RecoveryCodeForm />
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Two-factor is on, and this session has passed the check.
      </p>
      <div className="border-t pt-5">
        <RecoveryCodesRegenerate />
      </div>
      {!required && <DisableTwoFactorDialog />}
    </>
  );
}
