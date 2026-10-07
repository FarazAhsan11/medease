import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-4">
      <Logo />
      <div className="w-full max-w-md">
        <EmptyState
          icon={SearchXIcon}
          title="Page not found"
          description="The page you're looking for doesn't exist or has been moved."
          action={
            <Link href="/" className={buttonVariants()}>
              Back to home
            </Link>
          }
        />
      </div>
    </div>
  );
}
