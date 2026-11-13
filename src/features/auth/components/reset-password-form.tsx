"use client";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { resetPassword } from "@/features/auth/actions/reset-password";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState, type FormState } from "@/lib/form-state";

type ResetPasswordFormProps = {
  token: string;
  // Also sets the first password from a lab staff invitation.
  action?: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
};

export function ResetPasswordForm({
  token,
  action = resetPassword,
  submitLabel = "Update password",
}: ResetPasswordFormProps) {
  const { pending, onSubmit, fieldError } = useFormAction(
    action,
    initialFormState,
  );

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
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
        {submitLabel}
      </AuthSubmitButton>
    </form>
  );
}
