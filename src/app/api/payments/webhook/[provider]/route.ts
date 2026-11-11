import { after, NextResponse, type NextRequest } from "next/server";

import { getPaymentProvider } from "@/features/payments/lib/payment-provider.server";
import { sendDueRefunds } from "@/features/payments/lib/process-payments.server";
import { createAdminClient } from "@/lib/supabase/admin";

// Far above any provider's event, and small enough to read safely.
const MAX_BODY_BYTES = 64 * 1024;

// Codes that mean the event can never apply: answering 200 stops the
// provider retrying it. Anything else is a 500, so it retries. A payment for
// the wrong amount isn't one of them: the database refunds it. A refund event
// for the wrong amount is, and is logged for an admin.
const finalRefusals = new Set([
  "payment_not_found",
  "refund_not_found",
  "amount_mismatch",
  "invalid_event",
]);

// Server-to-server events from the payment provider (PAY-02, PAY-07). The
// signature is checked on the raw body before anything is read from it; the
// database applies each event once. Answers carry no payment details.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/payments/webhook/[provider]">,
) {
  const { provider: name } = await context.params;
  const provider = getPaymentProvider();
  if (!provider || provider.name !== name) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const event = provider.parseWebhook(rawBody, request.headers);
  if (!event) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const { data, error } = await createAdminClient().rpc(
    "record_payment_event",
    {
      p_provider: provider.name,
      p_event_id: event.id,
      p_type: event.type,
      p_provider_ref: event.providerRef ?? null,
      p_amount: event.amount,
      p_refund_id: event.refundId ?? null,
    },
  );

  if (error) {
    if (finalRefusals.has(error.message)) {
      console.error("Payment event refused:", error.message);
      return NextResponse.json({ result: "refused" });
    }
    console.error("Recording a payment event failed:", error.code);
    return NextResponse.json({ error: "not_recorded" }, { status: 500 });
  }

  // A payment that arrived late, twice or for the wrong amount is refunded
  // straight away.
  if (data === "refunding") {
    after(() => sendDueRefunds().catch(() => undefined));
  }

  return NextResponse.json({ result: data });
}
