import "server-only";

import { getPaymentProvider } from "@/features/payments/lib/payment-provider.server";
import { createAdminClient } from "@/lib/supabase/admin";

type ClaimedRefund = {
  refund_id: string;
  payment_ref: string;
  amount: number;
};

type PaymentToCheck = {
  payment_id: string;
  provider: string;
  provider_ref: string;
  amount: number;
};

// Sends the refunds that are due (docs/payments.md). Each is claimed by one
// worker with its next try already booked, and its id goes to the provider as
// the idempotency key, so a retry never refunds twice. Answers with counts
// only.
export async function sendDueRefunds() {
  const provider = getPaymentProvider();
  if (!provider) return { claimed: 0, sent: 0 };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_refunds", {
    p_provider: provider.name,
    p_limit: 20,
  });
  if (error) throw new Error(`claim_refunds: ${error.message}`);

  const refunds = (data ?? []) as ClaimedRefund[];
  const results = await Promise.allSettled(
    refunds.map(async (refund) => {
      let result;
      try {
        result = await provider.refund({
          refundId: refund.refund_id,
          paymentRef: refund.payment_ref,
          amount: refund.amount,
        });
      } catch (cause) {
        await admin.rpc("record_refund_result", {
          p_refund_id: refund.refund_id,
          p_outcome: "error",
          p_provider_ref: null,
          p_error: "send_failed",
        });
        throw cause;
      }
      // The provider took it. If saving that fails, the next try sends the
      // same idempotency key and gets the same answer back to save.
      const { error: recordError } = await admin.rpc("record_refund_result", {
        p_refund_id: refund.refund_id,
        p_outcome: result.outcome,
        p_provider_ref: result.providerRef ?? null,
        p_error: null,
      });
      if (recordError) throw new Error(recordError.message);
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        "Sending a refund failed:",
        result.reason instanceof Error ? result.reason.message : "unknown",
      );
    }
  }

  return {
    claimed: refunds.length,
    sent: results.filter((result) => result.status === "fulfilled").length,
  };
}

// Asks the provider about attempts long past expiry, in case their webhook
// was lost. A payment it says went through is applied like its webhook would
// be, so the booking is confirmed or the money goes back.
export async function reconcilePayments() {
  const provider = getPaymentProvider();
  if (!provider) return { checked: 0, recovered: 0 };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_payments_to_reconcile", {
    p_limit: 50,
  });
  if (error) throw new Error(`claim_payments_to_reconcile: ${error.message}`);

  let recovered = 0;
  for (const payment of (data ?? []) as PaymentToCheck[]) {
    if (payment.provider !== provider.name) continue;
    const status = await provider
      .getPaymentStatus(payment.provider_ref)
      .catch(() => "unknown" as const);
    if (status !== "paid") continue;

    const { error: eventError } = await admin.rpc("record_payment_event", {
      p_provider: provider.name,
      p_event_id: `reconcile:${payment.payment_id}`,
      p_type: "payment.succeeded",
      p_provider_ref: payment.provider_ref,
      p_amount: payment.amount,
      p_refund_id: null,
    });
    if (eventError) {
      console.error("Reconciling a payment failed:", eventError.message);
    } else {
      recovered++;
    }
  }

  return { checked: (data ?? []).length, recovered };
}
