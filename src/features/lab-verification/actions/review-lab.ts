"use server";

import { redirect } from "next/navigation";

import { adminRoutes } from "@/config/routes";
import { notifyLabReviewed } from "@/features/lab-verification/lib/lab-verification-notifications";
import { reviewLabSchema } from "@/features/lab-verification/schemas/lab-verification";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const messages: Record<string, string> = {
  not_admin: "Please pass your two-factor check first.",
  lab_not_found: "We couldn't find this lab.",
  already_reviewed: "This lab has already been reviewed.",
  email_not_confirmed: "This lab hasn't confirmed its email yet.",
  documents_missing:
    "This lab hasn't sent its licence and licensing authority yet.",
  note_required: "Tell the lab what's needed.",
  details_changed:
    "The lab has sent new details since you opened this page. Reload to see them.",
};

// admin_review_lab re-checks the admin, the status and the licence, refuses
// the decision if the lab has sent new details since the admin loaded them,
// and writes the audit log entry in the same transaction.
export const reviewLab = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = reviewLabSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "admin") {
      return formError("Only admins can review labs.", "not_admin");
    }

    const { labId, submittedAt, decision, note } = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_review_lab", {
      p_lab_id: labId,
      p_decision: decision,
      p_submitted_at: submittedAt,
      p_note: note,
    });
    if (error) return databaseErrorState(error, messages, "Reviewing a lab");

    notifyLabReviewed(decision, data as string | null);

    await setFlash("success", "Decision saved. We've emailed the lab.");
    redirect(adminRoutes.labs);
  },
);
