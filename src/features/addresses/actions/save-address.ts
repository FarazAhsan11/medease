"use server";

import { refresh } from "next/cache";

import { addressErrorMessages } from "@/features/addresses/lib/addresses";
import { addressSchema } from "@/features/addresses/schemas/address";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// Adds an address, or updates one when an id is given. The function checks the
// caller owns the row and keeps one default per account.
export const saveAddress = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = addressSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("patient");
    if (await isRateLimited(rateLimits.addressUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const address = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_patient_address", {
      p_id: address.id,
      p_label: address.label,
      p_street_address: address.streetAddress,
      p_area: address.area,
      p_city: address.city,
      p_contact_phone: address.contactPhone,
      p_landmark: address.landmark,
      p_contact_name: address.contactName,
      p_is_default: address.isDefault,
    });

    if (error) {
      return databaseErrorState(
        error,
        addressErrorMessages,
        "Saving an address",
      );
    }

    refresh();
    return {
      status: "success",
      message: address.id ? "Address updated." : "Address saved.",
    };
  },
);
