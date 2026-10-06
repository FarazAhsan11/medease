import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { ContactFields } from "@/features/auth/components/contact-fields";
import { NameFields } from "@/features/auth/components/name-fields";
import { PasswordInput } from "@/features/auth/components/password-input";

export function RegisterForm() {
  return (
    <>
      <form>
        <NameFields />
        <ContactFields />
        <PasswordInput />
        <AuthSubmitButton>Create account</AuthSubmitButton>
      </form>
      <AuthFooterLink
        prompt="Already have an account?"
        href="/login"
        label="Login here"
      />
    </>
  );
}
