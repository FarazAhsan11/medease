"use server";

import { refresh } from "next/cache";

import { labOrderErrorMessages } from "@/features/lab-orders/lib/lab-orders";
import { labOrderSchema } from "@/features/lab-orders/schemas/lab-order";
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

// The database checks the caller is the appointment's doctor, the visit is in
// its window and every test is on the shared list, then tells the patient.
export const saveLabOrder = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = labOrderSchema.safeParse({
      ...Object.fromEntries(formData),
      testIds: formData.getAll("testIds"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("doctor");
    if (await isRateLimited(rateLimits.labOrderUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { appointmentId, testIds, priority, note } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_lab_order", {
      p_appointment_id: appointmentId,
      p_test_ids: testIds,
      p_priority: priority,
      p_note: note,
    });
    if (error) {
      return databaseErrorState(
        error,
        labOrderErrorMessages,
        "Saving a lab order",
      );
    }

    refresh();
    return {
      status: "success",
      message: "Lab tests saved. The patient can book them in the app.",
    };
  },
);
