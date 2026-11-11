import "server-only";

import type { PaymentProvider } from "@/features/payments/lib/providers/types";
import {
  createTestProvider,
  type TestProvider,
} from "@/features/payments/lib/providers/test-provider.server";
import { getPaymentEnv } from "@/lib/env.server";

// The configured provider, or null when patients pay in cash only.
export function getPaymentProvider(): PaymentProvider | null {
  const env = getPaymentEnv();
  if (!env) return null;
  return createTestProvider(env.PAYMENT_TEST_SECRET);
}

export function onlinePaymentsEnabled() {
  return getPaymentProvider() !== null;
}

// Only while the test provider is the configured one.
export function getTestProvider(): TestProvider | null {
  const env = getPaymentEnv();
  return env?.PAYMENT_PROVIDER === "test"
    ? createTestProvider(env.PAYMENT_TEST_SECRET)
    : null;
}
