"use server";

import { randomUUID } from "node:crypto";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getTestProvider } from "@/features/payments/lib/payment-provider.server";

const schema = z.object({
  session: z.string().min(1).max(2000),
  outcome: z.enum(["paid", "declined", "back"]),
});

// The test provider's checkout (development only): tells our server how the
// payment went through its signed webhook, as a real provider would, then
// sends the patient back. Nothing here marks anything paid directly.
export async function completeTestCheckout(formData: FormData) {
  const provider = getTestProvider();
  if (!provider) notFound();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  const session = parsed.success
    ? provider.readSession(parsed.data.session)
    : null;
  if (!parsed.success || !session) notFound();

  if (parsed.data.outcome !== "back" && Date.now() < session.expiresAt) {
    await provider.sendWebhook({
      id: `evt_${randomUUID()}`,
      type:
        parsed.data.outcome === "paid" ? "payment.succeeded" : "payment.failed",
      amount: session.amount,
      providerRef: session.ref,
    });
  }

  redirect(session.returnPath);
}
