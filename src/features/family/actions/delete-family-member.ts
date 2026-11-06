"use server";

import { refresh } from "next/cache";

import { familyErrorMessages } from "@/features/family/lib/family-members";
import { deleteFamilyMemberSchema } from "@/features/family/schemas/family-member";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Only someone with no visits or records can be removed; the function checks.
export const deleteFamilyMember = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = deleteFamilyMemberSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      return formError(familyErrorMessages.family_member_not_found);
    }

    await requireRole("patient");
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_family_member", {
      p_id: parsed.data.id,
    });
    if (error) {
      return databaseErrorState(
        error,
        familyErrorMessages,
        "Removing a family member",
      );
    }

    refresh();
    return { status: "success", message: "Family member removed." };
  },
);
