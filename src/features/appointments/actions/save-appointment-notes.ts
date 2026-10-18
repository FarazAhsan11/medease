"use server";

import { refresh } from "next/cache";

import { appointmentNotesSchema } from "@/features/appointments/schemas/appointment";
import { getSessionUser } from "@/lib/auth/session";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Notes are private to the doctor; row level security only lets a doctor
// write notes on their own appointments.
export const saveAppointmentNotes = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = appointmentNotesSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "doctor") {
      return formError("Only doctors can add notes.", "not_doctor");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("appointment_notes").upsert({
      appointment_id: parsed.data.appointmentId,
      doctor_id: user.id,
      notes: parsed.data.notes,
    });
    if (error) {
      console.error("Saving notes failed:", error.code, error.message);
      return formError("We couldn't save your notes. Please try again.");
    }

    refresh();
    return { status: "success", message: "Notes saved." };
  },
);
