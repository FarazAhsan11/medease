"use server";

import { refresh } from "next/cache";

import { summaryBlockMessages } from "@/features/visit-summaries/lib/visit-summaries";
import { visitSummarySchema } from "@/features/visit-summaries/schemas/visit-summary";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const messages: Record<string, string> = {
  not_doctor: "Only doctors can write visit summaries.",
  appointment_not_found: "We couldn't find that appointment.",
  appointment_cancelled: summaryBlockMessages.cancelled,
  appointment_no_show: summaryBlockMessages.no_show,
  summary_not_started: summaryBlockMessages.not_started,
  summary_window_closed: summaryBlockMessages.window_closed,
  invalid_summary:
    "Check the summary: add a diagnosis, advice or a follow-up date within a year of the visit.",
};

// The database checks the caller is the appointment's doctor and that the
// appointment is inside its summary window, then tells the patient in the app.
export const saveVisitSummary = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = visitSummarySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "doctor") {
      return formError(messages.not_doctor, "not_doctor");
    }

    const { appointmentId, diagnosis, advice, followUpOn } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_visit_summary", {
      p_appointment_id: appointmentId,
      p_diagnosis: diagnosis,
      p_advice: advice,
      p_follow_up_on: followUpOn,
    });
    if (error)
      return databaseErrorState(error, messages, "Saving a visit summary");

    refresh();
    return {
      status: "success",
      message: "Visit summary saved. The patient can see it in the app.",
    };
  },
);
