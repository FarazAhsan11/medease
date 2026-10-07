import Link from "next/link";

import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitLink } from "@/features/auth/components/auth-submit-link";
import { PasswordInput } from "@/features/auth/components/password-input";

type LoginFormProps = {
  registerHref: string;
  dashboardHref: string;
};

export function LoginForm({ registerHref, dashboardHref }: LoginFormProps) {
  return (
    <>
      <form className="grid gap-4">
        <FormField id="login-email" label="Email">
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
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
          />
        </div>
        <AuthSubmitLink href={dashboardHref}>Log in</AuthSubmitLink>
      </form>
      <AuthFooterLink
        prompt="Don't have an account?"
        href={registerHref}
        label="Create one"
      />
    </>
  );
}
