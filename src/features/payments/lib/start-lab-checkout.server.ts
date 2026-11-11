import "server-only";

import { patientRoutes } from "@/config/routes";
import { getPaymentProvider } from "@/features/payments/lib/payment-provider.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type StartedPayment = {
  payment_id: string;
  amount: number;
  expires_at: string;
  checkout_url: string | null;
};

export type CheckoutStart = { url: string } | { error: string };

// Opens the provider's checkout for a booking waiting for payment. The
// database checks, under the patient's own session, that the booking is
// theirs and still held, and hands back an open checkout if one exists. Only
// then does the secret key store the new checkout, which a patient can't do.
export async function startLabCheckout(
  bookingId: string,
): Promise<CheckoutStart> {
  const provider = getPaymentProvider();
  if (!provider) return { error: "payments_off" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("start_lab_payment", {
      p_booking_id: bookingId,
      p_provider: provider.name,
    })
    .single<StartedPayment>();
  if (error) return { error: error.message };
  if (data.checkout_url) return { url: data.checkout_url };

  try {
    const checkout = await provider.createCheckout({
      paymentId: data.payment_id,
      amount: data.amount,
      expiresAt: new Date(data.expires_at),
      returnPath: patientRoutes.labBookingPayment(bookingId),
    });

    const { error: attachError } = await createAdminClient().rpc(
      "attach_payment_checkout",
      {
        p_payment_id: data.payment_id,
        p_provider_ref: checkout.providerRef,
        p_checkout_url: checkout.url,
      },
    );
    if (attachError) {
      console.error("Storing a checkout failed:", attachError.message);
      return { error: "checkout_failed" };
    }
    return { url: checkout.url };
  } catch (cause) {
    console.error(
      "Opening a checkout failed:",
      cause instanceof Error ? cause.message : "unknown",
    );
    return { error: "checkout_failed" };
  }
}
