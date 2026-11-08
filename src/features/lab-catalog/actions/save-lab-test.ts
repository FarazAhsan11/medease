"use server";

import { refresh } from "next/cache";

import { labCatalogErrorMessages } from "@/features/lab-catalog/lib/lab-catalog";
import { labTestSchema } from "@/features/lab-catalog/schemas/lab-catalog";
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

// Adds a test from the shared list to the lab's catalog, or updates it.
export const saveLabTest = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = labTestSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("lab");
    if (await isRateLimited(rateLimits.catalogUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const test = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_lab_test", {
      p_test_type_id: test.testTypeId,
      p_price: test.price,
      p_turnaround_hours: test.turnaroundHours,
      p_home_collection: test.homeCollection,
      p_preparation: test.preparation,
      p_listed: test.listed,
    });

    if (error) {
      return databaseErrorState(
        error,
        labCatalogErrorMessages,
        "Saving a lab test",
      );
    }

    refresh();
    return { status: "success", message: "Test saved to your catalog." };
  },
);
