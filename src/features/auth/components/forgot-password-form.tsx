"use client";

import { MailIcon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/features/auth/actions/request-password-reset";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { CheckEmailNotice } from "@/features/auth/components/check-email-notice";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function ForgotPasswordForm() {
  const { state, pending, onSubmit, fieldError } = useFormAction(
    requestPasswordReset,
    initialFormState,
  );
  const [email, setEmail] = useState("");
  const emailError = fieldError("email");

  if (state.status === "success") {
    return (
      <CheckEmailNotice
        title="Check your inbox"
        description={
          <>
            If <span className="font-medium text-foreground">{email}</span> has
            an account, we&apos;ve sent a link to reset your password. It
            expires in an hour.
          </>
        }
      />
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="reset-email" label="Email" error={emailError}>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            {...fieldErrorProps("reset-email", emailError)}
          />
        </FormField>
        <AuthSubmitButton pending={pending} pendingLabel="Sending…">
          <MailIcon aria-hidden />
          Send reset link
        </AuthSubmitButton>
      </form>
      <AuthFooterLink
        prompt="Remembered it?"
        href="/login"
        label="Back to log in"
      />
    </>
  );
}
