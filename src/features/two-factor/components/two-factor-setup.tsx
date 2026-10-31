"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { startTwoFactorSetup } from "@/features/two-factor/actions/two-factor";
import { TwoFactorCodeForm } from "@/features/two-factor/components/two-factor-code-form";
import type { TwoFactorSetupState } from "@/features/two-factor/schemas/two-factor";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type TwoFactorSetupProps = {
  required: boolean;
  onPaired: (codes: string[]) => void;
};

export function TwoFactorSetup({ required, onPaired }: TwoFactorSetupProps) {
  const { state, pending, onSubmit } = useFormAction<TwoFactorSetupState>(
    startTwoFactorSetup,
    initialFormState,
  );

  if (!state.factorId || !state.qrCode) {
    return (
      <form onSubmit={onSubmit} className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          {required
            ? "Your account protects patient information, so it needs an authenticator app, such as Google Authenticator or Authy."
            : "Add an authenticator app, such as Google Authenticator or Authy, so a stolen password isn't enough to open your account."}
        </p>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Starting…" : "Set up authenticator"}
        </Button>
      </form>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Scan this code with your authenticator app, then enter the 6-digit code
        it shows.
      </p>
      {/* A data URL from Supabase; next/image doesn't apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.qrCode}
        alt="QR code for your authenticator app"
        className="size-48 justify-self-center rounded-xl bg-white p-2"
      />
      <p className="text-xs break-all text-muted-foreground">
        Can&apos;t scan it? Enter this key: {state.secret}
      </p>
      <TwoFactorCodeForm factorId={state.factorId} onPaired={onPaired} />
    </div>
  );
}
