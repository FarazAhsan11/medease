"use server";

import { refresh } from "next/cache";

import { homeCollectionErrorMessages } from "@/features/home-collection/lib/home-collection";
import { deleteServiceAreaSchema } from "@/features/home-collection/schemas/home-collection";
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

// Removes a city. The last one can't go while home collection is on.
export const deleteServiceArea = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = deleteServiceAreaSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      return formError(homeCollectionErrorMessages.service_area_not_found);
    }

    const user = await requireRole("lab");
    if (await isRateLimited(rateLimits.catalogUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_lab_service_area", {
      p_id: parsed.data.id,
    });
    if (error) {
      return databaseErrorState(
        error,
        homeCollectionErrorMessages,
        "Removing a service area",
      );
    }

    refresh();
    return { status: "success", message: "City removed." };
  },
);
