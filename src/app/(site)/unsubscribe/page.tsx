import type { Metadata } from "next";

import { PanelCard } from "@/components/shared/panel-card";
import { UnsubscribeForm } from "@/features/medicine-reminders/components/unsubscribe-form";

export const metadata: Metadata = {
  title: "Turn off medicine reminders",
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <PanelCard title="Turn off medicine reminders">
        <div className="p-5">
          {typeof token === "string" ? (
            <UnsubscribeForm token={token} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This link isn&apos;t complete. Open it again from your email, or
              turn reminders off in your settings.
            </p>
          )}
        </div>
      </PanelCard>
    </div>
  );
}
