"use server";

import { refresh } from "next/cache";

import { homeCollectionErrorMessages } from "@/features/home-collection/lib/home-collection";
import { serviceAreaSchema } from "@/features/home-collection/schemas/home-collection";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// Adds a city the lab collects in, or updates one when an id is given.
export const saveServiceArea = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = serviceAreaSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const { user } = await requireLabMember("home_collection");
    if (await isRateLimited(rateLimits.catalogUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const area = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_lab_service_area", {
      p_id: area.id,
      p_city: area.city,
      p_fee: area.fee,
      p_note: area.note,
    });
    if (error) {
      return databaseErrorState(
        error,
        homeCollectionErrorMessages,
        "Saving a service area",
      );
    }

    refresh();
    return {
      status: "success",
      message: area.id ? `${area.city} updated.` : `${area.city} added.`,
    };
  },
);
