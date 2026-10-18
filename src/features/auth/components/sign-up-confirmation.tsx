import { CheckEmailNotice } from "@/features/auth/components/check-email-notice";
import { ResendConfirmationForm } from "@/features/auth/components/resend-confirmation-form";

type SignUpConfirmationProps = {
  email: string;
  loginHref: string;
};

export function SignUpConfirmation({
  email,
  loginHref,
}: SignUpConfirmationProps) {
  return (
    <CheckEmailNotice
      title="Confirm your email"
      description={
        <>
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Open it
          to activate your account.
        </>
      }
      loginHref={loginHref}
    >
      <ResendConfirmationForm email={email} />
    </CheckEmailNotice>
  );
}
