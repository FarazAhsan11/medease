import { MailIcon } from "lucide-react";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";

export function ForgotPasswordForm() {
  return (
    <>
      <form className="grid gap-4">
        <FormField id="reset-email" label="Email">
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </FormField>
        <Button type="button" className="mt-2 h-9 w-full gap-2">
          <MailIcon aria-hidden />
          Send reset link
        </Button>
      </form>
      <AuthFooterLink
        prompt="Remembered it?"
        href="/login"
        label="Back to log in"
      />
    </>
  );
}
