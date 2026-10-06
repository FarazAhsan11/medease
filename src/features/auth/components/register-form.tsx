import { Button } from "@/components/ui/button";
import { AccountFields } from "@/features/auth/components/account-fields";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";

export function RegisterForm() {
  return (
    <>
      <form className="grid gap-4">
        <AccountFields idPrefix="register" />
        <Button type="button" className="mt-2 h-9 w-full">
          Create account
        </Button>
      </form>
      <AuthFooterLink
        prompt="Already have an account?"
        href="/login"
        label="Log in"
      />
    </>
  );
}
