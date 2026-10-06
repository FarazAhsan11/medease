import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="max-w-xl py-20">
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
    </Container>
  );
}
