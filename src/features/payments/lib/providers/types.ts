// What MedEase needs from a payment provider (docs/payments.md). Each provider
// is one adapter: hosted checkout, refunds, and its webhook format turned into
// these events. Amounts are whole rupees.

export type ProviderName = "test";

export type CheckoutRequest = {
  paymentId: string;
  amount: number;
  // The checkout closes when the booking's hold does.
  expiresAt: Date;
  // A path on this site the patient comes back to.
  returnPath: string;
};

export type Checkout = { providerRef: string; url: string };

export type RefundRequest = {
  // Sent as the idempotency key: the same refund sent twice refunds once.
  refundId: string;
  paymentRef: string;
  amount: number;
};

export type RefundResult = {
  // "submitted": accepted, and the provider's webhook will say when it's done.
  outcome: "succeeded" | "submitted";
  providerRef?: string;
};

export type PaymentEventType =
  "payment.succeeded" | "payment.failed" | "refund.succeeded" | "refund.failed";

export type PaymentEvent = {
  id: string;
  type: PaymentEventType;
  amount: number;
  // The checkout, for payment events.
  providerRef?: string;
  // Our refund id, for refund events.
  refundId?: string;
};

export interface PaymentProvider {
  name: ProviderName;
  createCheckout(request: CheckoutRequest): Promise<Checkout>;
  refund(request: RefundRequest): Promise<RefundResult>;
  // Null when the signature or body isn't valid.
  parseWebhook(rawBody: string, headers: Headers): PaymentEvent | null;
  // Asked about payments whose webhook may have been lost.
  getPaymentStatus(providerRef: string): Promise<"paid" | "unpaid" | "unknown">;
}
