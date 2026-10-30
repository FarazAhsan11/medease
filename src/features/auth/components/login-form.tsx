"use client";

import Link from "next/link";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/features/auth/actions/sign-in";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type LoginFormProps = {
  // Left out for accounts nobody can sign up for themselves.
  registerHref?: string;
  next?: string;
};

export function LoginForm({ registerHref, next }: LoginFormProps) {
  const { state, pending, onSubmit, fieldError } = useFormAction(
    signIn,
    initialFormState,
  );
  // Only a wrong email/password points at the fields; outages and rate
  // limits are shown as a toast without blaming what the user typed.
  const credentialsInvalid =
    state.status === "error" && state.code === "invalid_credentials";
  const emailError = fieldError("email");
  const passwordError = fieldError("password");

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <FormField id="login-email" label="Email" error={emailError}>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            {...fieldErrorProps("login-email", emailError)}
            aria-invalid={Boolean(emailError) || credentialsInvalid}
          />
        </FormField>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            {...fieldErrorProps("login-password", passwordError)}
            aria-invalid={Boolean(passwordError) || credentialsInvalid}
          />
          {passwordError && (
            <p id="login-password-error" className="text-xs text-destructive">
              {passwordError}
            </p>
          )}
        </div>
        <AuthSubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </AuthSubmitButton>
      </form>
      {registerHref && (
        <AuthFooterLink
          prompt="Don't have an account?"
          href={
            next
              ? `${registerHref}?next=${encodeURIComponent(next)}`
              : registerHref
          }
          label="Create one"
        />
      )}
    </>
  );
}
