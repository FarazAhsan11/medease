"use client";

import { CircleAlertIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/features/auth/actions/sign-in";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { PasswordInput } from "@/features/auth/components/password-input";
import type { SignInState } from "@/features/auth/schemas/sign-in";

type LoginFormProps = {
  registerHref: string;
  next?: string;
};

const initialState: SignInState = {};

export function LoginForm({ registerHref, next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [email, setEmail] = useState("");

  return (
    <>
      <form action={formAction} className="grid gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {state.error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}
        <FormField id="login-email" label="Email">
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(state.error)}
            required
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
            aria-invalid={Boolean(state.error)}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="mt-2 h-9 w-full gap-2"
        >
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <AuthFooterLink
        prompt="Don't have an account?"
        href={registerHref}
        label="Create one"
      />
    </>
  );
}
