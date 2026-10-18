"use client";

import { signUpPatient } from "@/features/auth/actions/sign-up";
import { AccountFields } from "@/features/auth/components/account-fields";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { SignUpConfirmation } from "@/features/auth/components/sign-up-confirmation";
import type { SignUpState } from "@/features/auth/schemas/sign-up";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type RegisterFormProps = {
  next?: string;
};

export function RegisterForm({ next }: RegisterFormProps) {
  const { state, pending, onSubmit, fieldError } = useFormAction<SignUpState>(
    signUpPatient,
    initialFormState,
  );

  if (state.confirmEmail) {
    return <SignUpConfirmation email={state.confirmEmail} loginHref="/login" />;
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <AccountFields idPrefix="register" fieldError={fieldError} />
        <AuthSubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </AuthSubmitButton>
      </form>
      <AuthFooterLink
        prompt="Already have an account?"
        href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
        label="Log in"
      />
    </>
  );
}
