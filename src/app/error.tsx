"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Catches anything unexpected below the root layout, so the header stays put
// and the user gets a way forward instead of a blank screen.
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="max-w-md py-24">
      <EmptyState
        icon={TriangleAlertIcon}
        title="This page couldn't load"
        description="Something went wrong while loading this page. It's usually temporary, so please try again. If you're offline, reconnect first."
        action={
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <Button onClick={() => retry()} className="gap-1.5">
                <RotateCwIcon aria-hidden />
                Try again
              </Button>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Go home
              </Link>
            </div>
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Error reference: {error.digest}
              </p>
            )}
          </div>
        }
      />
    </Container>
  );
}
