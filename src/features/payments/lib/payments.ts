// Shared by the server and the browser: payment wording and error text
// (PAY-07, docs/payments.md).

export const paymentErrorMessages: Record<string, string> = {
  payments_off:
    "Online payment isn't available right now. Choose cash instead.",
  checkout_failed:
    "We couldn't open the payment page. Please try again in a moment.",
  booking_not_found: "We couldn't find this booking.",
  already_paid: "This booking is already paid.",
  not_awaiting_payment: "This booking isn't waiting for a payment.",
  payment_window_closed:
    "The time to pay for this booking has run out. Please book again.",
  payment_in_progress:
    "The payment page is still opening. Wait a moment, then try again.",
  too_many_attempts:
    "This booking has had too many payment attempts. Please book again or choose cash.",
};

export type PaymentAttemptStatus =
  "pending" | "paid" | "failed" | "expired" | "refunded" | "partially_refunded";
