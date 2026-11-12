"use server";

import { refresh } from "next/cache";

import { labOrderErrorMessages } from "@/features/lab-orders/lib/lab-orders";
import { cancelLabOrderSchema } from "@/features/lab-orders/schemas/lab-order";
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

export const cancelLabOrder = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = cancelLabOrderSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("doctor");
    if (await isRateLimited(rateLimits.labOrderUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_lab_order", {
      p_appointment_id: parsed.data.appointmentId,
    });
    if (error) {
      return databaseErrorState(
        error,
        labOrderErrorMessages,
        "Cancelling a lab order",
      );
    }

    refresh();
    return { status: "success", message: "Lab order cancelled." };
  },
);
