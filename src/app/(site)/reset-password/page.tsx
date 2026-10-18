import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Set a new password",
};

// The reset email link signs the user in, then lands here.
export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  if (!user) {
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
      role={user.role}
      title="Set a new password"
      description="Choose a strong password you don't use on other sites."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
