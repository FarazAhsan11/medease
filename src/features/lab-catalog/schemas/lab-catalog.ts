import { z } from "zod";

import {
  MAX_LAB_PRICE,
  PACKAGE_TESTS,
  TURNAROUND_HOURS,
} from "@/features/lab-catalog/lib/lab-catalog";

const switchValue = z
  .literal("on")
  .optional()
  .transform((value) => value === "on");

const price = z.coerce
  .number("Enter a price in rupees.")
  .int("Enter a whole number of rupees.")
  .min(1, "Enter a price in rupees.")
  .max(MAX_LAB_PRICE, "Enter a price under Rs 1,000,000.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .transform((value) => value || null);

export const labTestSchema = z.object({
  testTypeId: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Choose a test.")
    .max(40, "Choose a test."),
  price,
  turnaroundHours: z.coerce
    .number()
    .refine(
      (hours) => (TURNAROUND_HOURS as readonly number[]).includes(hours),
      "Choose when results are ready.",
    ),
  homeCollection: switchValue,
  preparation: optionalText(300),
  listed: switchValue,
});

export const labPackageSchema = z.object({
  id: z
    .string()
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
  name: z
    .string()
    .trim()
    .min(3, "Give the package a name.")
    .max(80, "Keep the name under 80 characters."),
  description: optionalText(300),
  price,
  testIds: z
    .array(z.uuid())
    .transform((ids) => [...new Set(ids)])
    .pipe(
      z
        .array(z.uuid())
        .min(PACKAGE_TESTS.min, `Choose at least ${PACKAGE_TESTS.min} tests.`)
        .max(PACKAGE_TESTS.max, `Choose up to ${PACKAGE_TESTS.max} tests.`),
    ),
  listed: switchValue,
});

export const catalogListedSchema = z.object({
  kind: z.enum(["test", "package"]),
  id: z.uuid(),
  listed: z.boolean(),
});

export const deleteLabPackageSchema = z.object({ id: z.uuid() });
