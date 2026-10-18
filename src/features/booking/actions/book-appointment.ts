"use server";

import { redirect } from "next/navigation";

import { patientRoutes } from "@/config/routes";
import { appointmentErrorState } from "@/features/appointments/lib/appointment-errors";
import { notifyAppointmentBooked } from "@/features/appointments/lib/appointment-notifications";
import {
  toAppointment,
  type AppointmentRow,
} from "@/features/appointments/lib/appointments";
import { bookAppointmentSchema } from "@/features/appointments/schemas/appointment";
import { getSessionUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/datetime";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// The database function re-checks everything (role, slot, double booking);
// this action validates input and handles the response.
export const bookAppointment = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = bookAppointmentSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "patient") {
      return formError(
        "Please log in with a patient account to book.",
        "not_patient",
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("book_appointment", {
      p_doctor_id: parsed.data.doctorId,
      p_starts_at: parsed.data.startsAt,
      p_reason: parsed.data.reason,
    });
    if (error) return appointmentErrorState(error);

    const row = data as AppointmentRow & { doctor_email: string | null };
    const appointment = toAppointment(row);
    await notifyAppointmentBooked(appointment, row.doctor_email);

    await setFlash(
      "success",
      `Booked with ${appointment.doctorName} for ${formatDateTime(appointment.startsAt, appointment.timezone)}.`,
    );
    redirect(patientRoutes.appointments);
  },
);
