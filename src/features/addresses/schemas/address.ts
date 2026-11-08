import { z } from "zod";

import { MAX_STREET_ADDRESS } from "@/features/addresses/lib/addresses";
import { phoneSchema } from "@/features/auth/schemas/sign-up";
import {
  optionalText,
  requiredText,
} from "@/features/medical-profile/schemas/medical-profile";
import { cities } from "@/lib/cities";

// Limits match the checks on patient_addresses.
export const addressSchema = z.object({
  id: z
    .string()
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
  label: requiredText("Give this address a name, such as Home.", 40),
  // Browsers send a textarea's line breaks as \r\n; store plain \n.
  streetAddress: z
    .string()
    .transform((value) => value.replace(/\r\n?/g, "\n"))
    .pipe(
      requiredText("Enter the house number and street.", MAX_STREET_ADDRESS),
    ),
  area: requiredText("Enter the area, sector or block.", 80),
  city: z.enum(cities, "Select a city."),
  landmark: optionalText(120),
  contactName: optionalText(80),
  // A pasted number can carry tabs or non-breaking spaces; the database takes
  // plain spaces only.
  contactPhone: z
    .string()
    .transform((value) => value.replace(/\s+/g, " "))
    .pipe(phoneSchema),
  isDefault: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
});

export const deleteAddressSchema = z.object({ id: z.uuid() });
