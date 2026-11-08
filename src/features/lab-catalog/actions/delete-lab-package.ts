"use server";

import { refresh } from "next/cache";

import { labCatalogErrorMessages } from "@/features/lab-catalog/lib/lab-catalog";
import { deleteLabPackageSchema } from "@/features/lab-catalog/schemas/lab-catalog";
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

// Deletes a package. The lab's tests in it stay in the catalog.
export const deleteLabPackage = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = deleteLabPackageSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      return formError(labCatalogErrorMessages.package_not_found);
    }

    const user = await requireRole("lab");
    if (await isRateLimited(rateLimits.catalogUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_lab_package", {
      p_package_id: parsed.data.id,
    });
    if (error) {
      return databaseErrorState(
        error,
        labCatalogErrorMessages,
        "Deleting a lab package",
      );
    }

    refresh();
    return { status: "success", message: "Package deleted." };
  },
);
