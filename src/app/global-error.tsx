"use client";

import { TriangleAlertIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Shown only when the root layout itself fails, so it renders its own page.
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong | MedEase</title>
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md">
            <EmptyState
              icon={TriangleAlertIcon}
              title="MedEase couldn't load"
              description="Something went wrong on our end. It's usually temporary, so please try again."
              action={
                <div className="flex flex-col items-center gap-3">
                  <Button onClick={() => retry()}>Try again</Button>
                  {error.digest && (
                    <p className="text-xs text-muted-foreground">
                      Error reference: {error.digest}
                    </p>
                  )}
                </div>
              }
            />
          </div>
        </main>
      </body>
    </html>
  );
}
