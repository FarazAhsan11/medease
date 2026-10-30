"use server";

import { redirect } from "next/navigation";

import { adminRoutes } from "@/config/routes";
import { notifyDoctorReviewed } from "@/features/doctor-verification/lib/verification-notifications";
import { reviewDoctorSchema } from "@/features/doctor-verification/schemas/verification";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const messages: Record<string, string> = {
  not_admin: "Please pass your two-factor check first.",
  doctor_not_found: "We couldn't find this doctor.",
  already_reviewed: "This doctor has already been reviewed.",
  email_not_confirmed: "This doctor hasn't confirmed their email yet.",
  documents_missing: "This doctor hasn't uploaded all their documents yet.",
  note_required: "Tell the doctor what's needed.",
};

// admin_review_doctor re-checks the admin, the status and the documents, and
// writes the audit log entry in the same transaction.
export const reviewDoctor = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = reviewDoctorSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "admin") {
      return formError("Only admins can review doctors.", "not_admin");
    }

    const { doctorId, decision, note } = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_review_doctor", {
      p_doctor_id: doctorId,
      p_decision: decision,
      p_note: note,
    });
    if (error) return databaseErrorState(error, messages, "Reviewing a doctor");

    notifyDoctorReviewed(decision, data as string | null);

    await setFlash("success", "Decision saved. We've emailed the doctor.");
    redirect(adminRoutes.home);
  },
);
