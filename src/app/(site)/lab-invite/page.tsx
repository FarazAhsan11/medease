import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { dashboards } from "@/config/dashboards";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { findValidAuthToken } from "@/features/auth/lib/auth-tokens";
import { acceptLabInvite } from "@/features/lab-staff/actions/accept-lab-invite";
import { getLabInviteDetails } from "@/features/lab-staff/data/lab-staff";
import { labRoleLabels } from "@/features/lab-staff/lib/lab-permissions";

export const metadata: Metadata = {
  title: "Join your lab",
};

// Opened from a lab staff invitation (LAB-07). The token is only checked here;
// it's used up when the password is saved.
export default async function LabInvitePage({
  searchParams,
}: PageProps<"/lab-invite">) {
  const { token } = await searchParams;
  const userId =
    typeof token === "string"
      ? await findValidAuthToken(token, "lab_invite")
      : null;
  const invite = userId ? await getLabInviteDetails(userId) : null;

  if (typeof token !== "string" || !invite) {
    return (
      <AuthShell
        role="lab"
        title="This invitation has expired"
        description="Invitations work once and expire after 7 days. Ask your lab admin to send a new one. If you've already set your password, log in."
      >
        <Link
          href={dashboards.lab.loginHref}
          className={buttonVariants({ className: "h-9 w-full" })}
        >
          Go to lab login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      role="lab"
      title={`Join ${invite.labName}`}
      description={`You've been added as ${labRoleLabels[invite.role].toLowerCase()}. Choose a password to start. Next you'll pair an authenticator app.`}
    >
      <ResetPasswordForm
        token={token}
        action={acceptLabInvite}
        submitLabel="Set password and continue"
      />
    </AuthShell>
  );
}
