import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TestCheckoutCard } from "@/features/payments/components/test-checkout-card";
import { getTestProvider } from "@/features/payments/lib/payment-provider.server";

export const metadata: Metadata = {
  title: "Test checkout",
  robots: { index: false },
};

// The stand-in payment provider's page. Not found unless the test provider is
// the configured one, which it never is in production.
export default async function TestCheckoutPage({
  searchParams,
}: PageProps<"/test-checkout">) {
  const provider = getTestProvider();
  if (!provider) notFound();

  const { session } = await searchParams;
  const checkout =
    typeof session === "string" ? provider.readSession(session) : null;
  if (typeof session !== "string" || !checkout) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <TestCheckoutCard
        session={session}
        amount={checkout.amount}
        expiresAt={checkout.expiresAt}
        expired={checkout.expired}
      />
    </div>
  );
}
