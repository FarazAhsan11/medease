import { UserRoundXIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

// For doctor accounts created before profiles existed (no doctor_profiles row).
export function MissingProfileNotice() {
  return (
    <EmptyState
      icon={UserRoundXIcon}
      title="Your doctor profile isn't set up"
      description="We couldn't find the profile for this account, so patients can't book you yet. Please contact support to finish setting it up."
      action={
        <Link href="/contact" className={buttonVariants()}>
          Contact support
        </Link>
      }
    />
  );
}
