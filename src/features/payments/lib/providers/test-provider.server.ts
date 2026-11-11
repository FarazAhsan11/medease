import "server-only";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { testCheckoutRoute } from "@/config/routes";
import type {
  PaymentEvent,
  PaymentProvider,
} from "@/features/payments/lib/providers/types";
import {
  readToken,
  signPayload,
  signToken,
  verifySignature,
} from "@/features/payments/lib/signature.server";
import { getSiteUrl } from "@/lib/env.server";

// A stand-in provider for development and tests (docs/payments.md). It
// behaves like a hosted checkout: its own page, a signed webhook sent to our
// server, then a redirect back. It keeps no state and moves no money, so it
// is never loaded on a production deployment (getPaymentEnv).

export const TEST_SIGNATURE_HEADER = "medease-test-signature";

const sessionSchema = z.object({
  ref: z.string().startsWith("tp_"),
  amount: z.number().int().positive(),
  expiresAt: z.number().int(),
  // A path on this site, never another address.
  returnPath: z.string().regex(/^\/patient\/[\w/-]+$/),
});

export type TestCheckoutSession = z.infer<typeof sessionSchema>;

const eventSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum([
    "payment.succeeded",
    "payment.failed",
    "refund.succeeded",
    "refund.failed",
  ]),
  amount: z.number().int().positive(),
  providerRef: z.string().max(200).optional(),
  refundId: z.uuid().optional(),
});

export function createTestProvider(secret: string) {
  const provider: PaymentProvider = {
    name: "test",

    async createCheckout(request) {
      const session: TestCheckoutSession = {
        ref: `tp_${randomUUID()}`,
        amount: request.amount,
        expiresAt: request.expiresAt.getTime(),
        returnPath: request.returnPath,
      };
      const url = new URL(testCheckoutRoute, getSiteUrl());
      url.searchParams.set("session", signToken(secret, session));
      return { providerRef: session.ref, url: url.toString() };
    },

    async refund(request) {
      return { outcome: "succeeded", providerRef: `tr_${request.refundId}` };
    },

    parseWebhook(rawBody, headers) {
      if (
        !verifySignature(secret, rawBody, headers.get(TEST_SIGNATURE_HEADER))
      ) {
        return null;
      }
      try {
        const parsed = eventSchema.safeParse(JSON.parse(rawBody));
        return parsed.success ? (parsed.data as PaymentEvent) : null;
      } catch {
        return null;
      }
    },

    async getPaymentStatus() {
      return "unknown";
    },
  };

  return {
    ...provider,

    // For the checkout page: the session it was opened with, if genuine.
    readSession(
      token: string,
    ): (TestCheckoutSession & { expired: boolean }) | null {
      const parsed = sessionSchema.safeParse(readToken(secret, token));
      if (!parsed.success) return null;
      return { ...parsed.data, expired: Date.now() >= parsed.data.expiresAt };
    },

    // What a provider's server does: tells ours how the payment went.
    async sendWebhook(event: PaymentEvent) {
      const body = JSON.stringify(event);
      const response = await fetch(
        new URL("/api/payments/webhook/test", getSiteUrl()),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            [TEST_SIGNATURE_HEADER]: signPayload(secret, body),
          },
          body,
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error(`Test webhook answered ${response.status}`);
      }
    },
  };
}

export type TestProvider = ReturnType<typeof createTestProvider>;
