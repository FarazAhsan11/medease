"use server";

import { refresh } from "next/cache";

import { labCatalogErrorMessages } from "@/features/lab-catalog/lib/lab-catalog";
import { catalogListedSchema } from "@/features/lab-catalog/schemas/lab-catalog";
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

type ListedInput = { kind: "test" | "package"; id: string; listed: boolean };

// Lists or unlists one test or package, from the switch on its row.
export const setCatalogListed = withFormErrors<FormState, ListedInput>(
  async (_previousState, input) => {
    const parsed = catalogListedSchema.safeParse(input);
    if (!parsed.success) {
      return formError(labCatalogErrorMessages.test_not_found);
    }

    const user = await requireRole("lab");
    if (await isRateLimited(rateLimits.catalogUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { kind, id, listed } = parsed.data;
    const supabase = await createClient();
    const { error } =
      kind === "test"
        ? await supabase.rpc("set_lab_test_listed", {
            p_test_id: id,
            p_listed: listed,
          })
        : await supabase.rpc("set_lab_package_listed", {
            p_package_id: id,
            p_listed: listed,
          });

    if (error) {
      return databaseErrorState(
        error,
        labCatalogErrorMessages,
        "Listing a catalog item",
      );
    }

    refresh();
    return { status: "success" };
  },
);
