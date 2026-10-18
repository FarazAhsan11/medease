import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { findValidAuthToken } from "@/features/auth/lib/auth-tokens";

export const metadata: Metadata = {
  title: "Set a new password",
};

// Opened from the reset email. The token is only checked here; it's used up
// when the new password is saved.
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const valid =
    typeof token === "string" &&
    (await findValidAuthToken(token, "password_reset")) !== null;

  if (!valid) {
    return (
      <AuthShell
        role="patient"
        title="This link has expired"
        description="Password reset links work once and expire after an hour. Request a new one to continue."
      >
        <Link
          href="/forgot-password"
          className={buttonVariants({ className: "h-9 w-full" })}
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      role="patient"
      title="Set a new password"
      description="Choose a strong password you don't use on other sites."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
