import Link from "next/link";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { PasswordInput } from "@/features/auth/components/password-input";

type LoginFormProps = {
  registerHref: string;
};

export function LoginForm({ registerHref }: LoginFormProps) {
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
            <Link href="#" className="text-xs text-primary hover:underline">
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
        <Button type="button" className="mt-2 h-9 w-full">
          Log in
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
