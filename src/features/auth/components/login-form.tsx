import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { authFieldClass } from "@/features/auth/lib/field-styles";

type LoginFormProps = {
  registerHref: string;
};

export function LoginForm({ registerHref }: LoginFormProps) {
  return (
    <>
      <form>
        <input
          type="email"
          name="email"
          required
          aria-label="Email"
          placeholder="Email"
          className={authFieldClass}
        />
        <PasswordInput />
        <AuthSubmitButton>Login</AuthSubmitButton>
      </form>
      <AuthFooterLink
        prompt="Don't have an account?"
        href={registerHref}
        label="Register here"
      />
    </>
  );
}
