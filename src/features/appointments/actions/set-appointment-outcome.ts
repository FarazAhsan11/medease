"use server";

import { refresh } from "next/cache";

import { appointmentErrorState } from "@/features/appointments/lib/appointment-errors";
import { appointmentOutcomeSchema } from "@/features/appointments/schemas/appointment";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

export const setAppointmentOutcome = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = appointmentOutcomeSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.rpc("set_appointment_outcome", {
      p_appointment_id: parsed.data.appointmentId,
      p_status: parsed.data.outcome,
    });
    if (error) return appointmentErrorState(error);

    refresh();
    return {
      status: "success",
      message:
        parsed.data.outcome === "completed"
          ? "Marked as completed."
          : "Marked as a no-show.",
    };
  },
);
