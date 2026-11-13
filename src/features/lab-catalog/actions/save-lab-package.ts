"use server";

import { refresh } from "next/cache";

import { labCatalogErrorMessages } from "@/features/lab-catalog/lib/lab-catalog";
import { labPackageSchema } from "@/features/lab-catalog/schemas/lab-catalog";
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

// Adds a package of the lab's own tests, or replaces one when an id is given.
export const saveLabPackage = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = labPackageSchema.safeParse({
      ...Object.fromEntries(formData),
      testIds: formData.getAll("testIds"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const { user } = await requireLabMember("catalog");
    if (await isRateLimited(rateLimits.catalogUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const labPackage = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_lab_package", {
      p_package_id: labPackage.id,
      p_name: labPackage.name,
      p_description: labPackage.description,
      p_price: labPackage.price,
      p_test_ids: labPackage.testIds,
      p_listed: labPackage.listed,
    });

    if (error) {
      return databaseErrorState(
        error,
        labCatalogErrorMessages,
        "Saving a lab package",
      );
    }

    refresh();
    return {
      status: "success",
      message: labPackage.id ? "Package updated." : "Package added.",
    };
  },
);
