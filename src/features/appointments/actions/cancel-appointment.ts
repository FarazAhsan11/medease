"use server";

import { refresh } from "next/cache";

import { appointmentErrorState } from "@/features/appointments/lib/appointment-errors";
import { notifyAppointmentCancelled } from "@/features/appointments/lib/appointment-notifications";
import {
  toAppointment,
  type AppointmentRow,
} from "@/features/appointments/lib/appointments";
import { cancelAppointmentSchema } from "@/features/appointments/schemas/appointment";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Patients and doctors both cancel through here; the database checks the
// caller owns the appointment and that it hasn't started.
export const cancelAppointment = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = cancelAppointmentSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_appointment", {
      p_appointment_id: parsed.data.appointmentId,
      p_reason: parsed.data.reason,
    });
    if (error) return appointmentErrorState(error);

    const row = data as AppointmentRow & { doctor_email: string | null };
    await notifyAppointmentCancelled(toAppointment(row), row.doctor_email);

    refresh();
    return { status: "success", message: "The appointment was cancelled." };
  },
);
