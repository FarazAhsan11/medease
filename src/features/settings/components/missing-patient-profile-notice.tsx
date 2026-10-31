import { UserRoundXIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

// For patient accounts with no patient_profiles row.
export function MissingPatientProfileNotice() {
  return (
    <EmptyState
      icon={UserRoundXIcon}
      title="Your profile isn't set up"
      description="We couldn't find the profile for this account. Please contact support to finish setting it up."
      action={
        <Link href="/contact" className={buttonVariants()}>
          Contact support
        </Link>
      }
    />
  );
}
