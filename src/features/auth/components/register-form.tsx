import { AccountFields } from "@/features/auth/components/account-fields";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitLink } from "@/features/auth/components/auth-submit-link";

export function RegisterForm() {
  return (
    <>
      <form className="grid gap-4">
        <AccountFields idPrefix="register" />
        <AuthSubmitLink href="/patient">Create account</AuthSubmitLink>
      </form>
      <AuthFooterLink
        prompt="Already have an account?"
        href="/login"
        label="Log in"
      />
    </>
  );
}
