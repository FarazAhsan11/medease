"use client";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { resetPassword } from "@/features/auth/actions/reset-password";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function ResetPasswordForm() {
  const { pending, onSubmit, fieldError } = useFormAction(
    resetPassword,
    initialFormState,
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField
        id="new-password"
        label="New password"
        hint="At least 8 characters."
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
        label="Confirm new password"
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
      <AuthSubmitButton pending={pending} pendingLabel="Saving…">
        Update password
      </AuthSubmitButton>
    </form>
  );
}
