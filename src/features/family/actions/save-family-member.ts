"use server";

import { refresh } from "next/cache";

import { familyErrorMessages } from "@/features/family/lib/family-members";
import { familyMemberSchema } from "@/features/family/schemas/family-member";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Adds a family member, or updates one when an id is given. The function
// checks the caller owns the row.
export const saveFamilyMember = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = familyMemberSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    await requireRole("patient");
    const member = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_family_member", {
      p_id: member.id,
      p_first_name: member.firstName,
      p_last_name: member.lastName,
      p_relation: member.relation,
      p_date_of_birth: member.dateOfBirth,
      p_gender: member.gender,
      p_blood_group: member.bloodGroup,
      p_height_cm: member.heightCm,
      p_weight_kg: member.weightKg,
      p_allergies: member.allergies,
      p_chronic_conditions: member.chronicConditions,
      p_current_medicines: member.currentMedicines,
    });

    if (error) {
      return databaseErrorState(
        error,
        familyErrorMessages,
        "Saving a family member",
      );
    }

    refresh();
    return {
      status: "success",
      message: member.id ? "Family member updated." : "Family member added.",
    };
  },
);
