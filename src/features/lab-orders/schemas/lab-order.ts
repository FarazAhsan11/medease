import { z } from "zod";

import {
  LAB_ORDER_PRIORITIES,
  MAX_ORDER_NOTE,
  MAX_ORDER_TESTS,
} from "@/features/lab-orders/lib/lab-orders";

// Test ids are the shared list's slugs, e.g. "cbc" or "lipid-profile".
const testId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Choose tests from the list.")
  .max(40, "Choose tests from the list.");

export const labOrderSchema = z.object({
  appointmentId: z.uuid(),
  testIds: z
    .array(testId)
    .min(1, "Choose at least one test.")
    .max(MAX_ORDER_TESTS, `Order at most ${MAX_ORDER_TESTS} tests.`)
    .refine((ids) => new Set(ids).size === ids.length, "A test is chosen twice."),
  priority: z.enum(LAB_ORDER_PRIORITIES, "Choose routine or urgent."),
  note: z
    .string()
    .trim()
    .max(MAX_ORDER_NOTE, `Keep the note under ${MAX_ORDER_NOTE} characters.`)
    .optional()
    .transform((value) => value || null),
});

export const cancelLabOrderSchema = z.object({ appointmentId: z.uuid() });
