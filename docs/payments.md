# Payments (PAY-07, with the parts of PAY-02 it needs)

A patient booking a lab test chooses to pay online now or in cash at the lab or to the collector. Online payment goes through a payment provider's hosted checkout, so MedEase never sees a card number or wallet PIN. Consultations (PAY-01) will use the same tables, webhook and refund queue.

No provider is signed yet. The code talks to providers through one adapter (`src/features/payments/lib/providers/`), and the only adapter today is a stand-in **test provider** with its own checkout page and signed webhooks, so the whole flow runs and is tested without a merchant account. Adding JazzCash, Easypaisa, Safepay or another aggregator is one adapter file plus the launch checklist at the end.

## Choices

**The webhook decides, never the browser.** A booking counts as paid only when a server-to-server webhook with a valid signature says so. Coming back from checkout only shows the status. Stripe gives the same rule: customers aren't guaranteed to reach the landing page, so fulfilment runs from the webhook ([Fulfill orders](https://docs.stripe.com/checkout/fulfillment), [Custom success page](https://docs.stripe.com/payments/checkout/custom-success-page)).

**Signatures are checked on the raw body, with a timestamp.** The signed text is `<timestamp>.<raw body>`, HMAC-SHA256, compared in constant time, and refused when the timestamp is more than five minutes off. The timestamp is inside the signature, so a captured request can't be replayed later with a fresh one ([OWASP Webhook Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)). The test provider signs this way, and a real adapter uses its provider's own scheme.

**Every event is applied once.** Providers retry and can deliver an event twice. `payment_events` has a unique `(provider, event_id)`, and `record_payment_event` inserts it in the same transaction as the change, so a repeat does nothing. Locks are always taken booking first, then payment, then refund, the same order as cancelling and releasing holds, so a webhook and a cancel arriving together wait for each other instead of deadlocking.

**The amount is checked.** A payment the provider says took a different amount doesn't confirm the booking. The money was still taken, so the payment is recorded as paid with `captured_amount` and all of it is refunded (reason `amount_mismatch`); the patient can pay again while the hold lasts. A refund event for the wrong amount is refused and logged for an admin.

**A spot is held while the patient pays.** An online booking starts as `awaiting_payment`, with `payment_due_at` 15 minutes ahead. The hold counts against the collection window's capacity like any booking, so nobody else takes the last visit while the patient is on the checkout page. PAY-01 says 10 minutes for consultations; lab bookings get 15 because wallet payments wait for an OTP on the phone. The checkout is told to expire at the same time.

**Holds are released by the database.** The `pg_cron` job `lab-payment-holds` runs every minute, in SQL only. It cancels holds two minutes past their due time (`cancelled_by = 'system'`, reason `payment_not_completed`) and expires their open payments. The two minutes cover a payment finished at the last second whose webhook is still on its way.

**The lab sees a booking only once it's confirmed.** `confirmed_at` is set when a booking becomes `booked`: at once for cash, on payment for online. The lab's read policies on bookings, items and history need it, so an unpaid hold or a lapsed one never reaches the lab's lists or notices.

**Money that arrives late or twice goes back.** A payment that succeeds for a booking already cancelled, or already paid by another attempt, is recorded as paid and refunded in full at once. A cancelled booking shows `refund_pending` again; an active one stays `paid`, since only the extra payment goes back. Nobody is left paid for nothing.

**Refunds go through a queue.** Cancelling a paid booking, by the patient, the lab or late payment, adds a `refunds` row in the same transaction. Its id is the idempotency key sent to the provider, so sending it twice refunds once. The cancel actions send it straight after the response (`after()`), and the `payments` cron (every 5 minutes) retries what's left: 5 tries with growing gaps, then `failed`, for an admin (ADM-09). A try that never reported back is marked `failed` too once its next turn comes. A refund the provider accepted but hasn't confirmed (`submitted`) is sent again daily under the same key, which only asks how it went. A success reported after `failed` still settles it, so the patient is never refunded twice by hand. Only paid cancellations trigger the immediate send; cash and unpaid ones queue nothing. Stripe's guidance is the same: retried requests with one idempotency key ([Idempotent requests](https://docs.stripe.com/api/idempotent_requests)).

**Refund rule.** A paid lab booking that is cancelled is refunded in full: the patient can cancel only before the sample is taken, and a lab cancellation is never the patient's cost. No late-cancel fee, since nothing has been spent yet.

**Reconciling.** The same cron asks the provider about payments still open or expired 10 minutes past their expiry, from the last two days, once each (`reconciled_at`). A payment the provider says succeeded is applied as an event, so a lost webhook still confirms or refunds. The test provider keeps no state, so it answers "unknown".

**Live updates.** Each payment change announces `lab_booking` on the patient's `user:<id>` channel with the booking id and new statuses. The return page refreshes when its booking changes. It never polls.

**Off where it isn't safe.** `PAYMENT_PROVIDER` picks the adapter. Unset, patients see cash only. The test provider refuses to load on any Vercel deployment, preview or production (`VERCEL` is set), since anyone could "pay" through it and every deployment shares the one database. It runs only on a developer's machine.

## Data

- `lab_bookings`: `payment_method` `cash | online`; `payment_status` `unpaid | paid | refund_pending | refunded`; `payment_due_at` while awaiting payment; `confirmed_at`; status `awaiting_payment`; `cancelled_by` `system`.
- `payments`: one row per checkout attempt. Status `pending → paid → refunded / partially_refunded`, or `pending → failed / expired`. A failed or expired attempt can still turn `paid` if the provider later says so. At most one open attempt per booking, at most 5 attempts. `provider_ref` (the checkout id) is unique per provider.
- `payment_events`: every applied provider event: provider, event id, type, payment, amount. No payload is kept: it can hold the payer's details.
- `refunds`: `pending → submitted → succeeded`, or `failed` after 5 tries. One per payment, since refunds are full. Reasons: `booking_cancelled`, `late_payment`, `duplicate_payment`, `amount_mismatch`.

Patients read their own payments and refunds. Nobody writes directly. Webhooks, refunds and reconciling run with the secret key, through functions granted only to `service_role`.

## Flow

1. The patient picks "Pay online" and books. `book_lab_test(p_payment_method => 'online')` makes an `awaiting_payment` booking. The action then calls `start_lab_payment` (patient session: checks the booking is theirs, still awaiting and not past due), asks the adapter for a checkout, and stores its id and URL with `attach_payment_checkout` (secret key). It then redirects to the checkout.
2. If the checkout can't be made, the patient lands on the booking's payment page with "Pay now".
3. The provider sends `payment.succeeded` or `payment.failed` to `/api/payments/webhook/<provider>`. `record_payment_event` confirms the booking (`booked`, `paid`, `confirmed_at`), and the lab and patient get their usual booked notices.
4. The provider sends the patient back to `/patient/lab-tests/bookings/<id>/payment`, which shows confirmed, still confirming (live), failed (pay again) or lapsed.

## Launch checklist for a real provider

- A merchant account, and an adapter implementing `PaymentProvider`, with its own signature check and refund call. Add its name to the `payments.provider` check.
- Privacy policy: add the provider to the provider table. Refund policy and terms: describe online lab payments and the refund rule above. Raise their versions.
- Receipts (PAY-05), the ledger and payouts (PAY-06), and an admin view of `failed` refunds (ADM-09).
- Account deletion (AUTH-05) must keep payment records as long as the law requires; today they cascade with the booking.
- Cash: nothing marks a cash booking paid yet; that comes with the ledger.
