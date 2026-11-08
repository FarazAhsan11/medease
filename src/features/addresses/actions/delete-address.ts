"use server";

import { refresh } from "next/cache";

import { addressErrorMessages } from "@/features/addresses/lib/addresses";
import { deleteAddressSchema } from "@/features/addresses/schemas/address";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// Bookings keep their own copy of an address, so any address can be deleted.
export const deleteAddress = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = deleteAddressSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return formError(addressErrorMessages.address_not_found);
    }

    const user = await requireRole("patient");
    if (await isRateLimited(rateLimits.addressUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_patient_address", {
      p_id: parsed.data.id,
    });
    if (error) {
      return databaseErrorState(
        error,
        addressErrorMessages,
        "Deleting an address",
      );
    }

    refresh();
    return { status: "success", message: "Address deleted." };
  },
);
