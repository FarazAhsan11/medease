"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/features/auth/actions/change-password";
import { PasswordInput } from "@/features/auth/components/password-input";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function ChangePasswordCard() {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit, fieldError } = useFormAction(
    changePassword,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <PanelCard title="Password" description="Use at least 8 characters.">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="grid gap-4 p-5"
        noValidate
      >
        <FormField
          id="current-password"
          label="Current password"
          error={fieldError("currentPassword")}
        >
          <PasswordInput
            id="current-password"
            name="currentPassword"
            autoComplete="current-password"
            required
            {...fieldErrorProps(
              "current-password",
              fieldError("currentPassword"),
            )}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="new-password"
            label="New password"
            error={fieldError("password")}
          >
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
              required
              {...fieldErrorProps("new-password", fieldError("password"))}
            />
          </FormField>
          <FormField
            id="confirm-password"
            label="Confirm password"
            error={fieldError("confirmPassword")}
          >
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              {...fieldErrorProps(
                "confirm-password",
                fieldError("confirmPassword"),
              )}
            />
          </FormField>
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          className="w-fit gap-2"
        >
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </PanelCard>
  );
}
