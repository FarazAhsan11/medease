import { MailIcon, UserXIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions/sign-out";
import { getMembership } from "@/features/lab-staff/lib/lab-member.server";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "No lab access",
};

// Where requireLabMember sends a lab account that isn't an active member: one
// the lab removed, or one that set a password some other way before accepting
// its invitation. It shows no lab data.
export default async function LabAccessEndedPage() {
  await requireRole("lab");
  const membership = await getMembership();
  const invited = membership?.status === "invited";

  return (
    <EmptyState
      icon={invited ? MailIcon : UserXIcon}
      title={
        invited
          ? "Finish joining your lab"
          : "Your access to this lab has ended"
      }
      description={
        invited
          ? "Open the link in your invitation email to join. If it has expired, ask your lab admin to send it again."
          : "Your lab admin has removed this account from their staff. If you think this is a mistake, ask them to invite you again."
      }
      action={
        <form action={signOut}>
          <Button type="submit" className="h-9 px-4">
            Log out
          </Button>
        </form>
      }
    />
  );
}
