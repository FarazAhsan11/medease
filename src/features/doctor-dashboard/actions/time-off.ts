"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { timeOffSchema } from "@/features/doctor-dashboard/schemas/time-off";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const timeOffErrors = {
  not_doctor: "Only doctors can set time off.",
  invalid_time_off: "Choose dates from today up to a year ahead.",
  time_off_overlap: "You already have time off on some of those days.",
  time_off_not_found: "We couldn't find that time off.",
};

export const addTimeOff = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = timeOffSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.rpc("add_doctor_time_off", {
      p_starts_on: parsed.data.startsOn,
      p_ends_on: parsed.data.endsOn,
    });
    if (error)
      return databaseErrorState(error, timeOffErrors, "Adding time off");

    refresh();
    return { status: "success", message: "Time off added." };
  },
);

export const removeTimeOff = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = z.uuid().safeParse(formData.get("id"));
    if (!parsed.success) {
      return formError(timeOffErrors.time_off_not_found, "time_off_not_found");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_doctor_time_off", {
      p_id: parsed.data,
    });
    if (error) {
      return databaseErrorState(error, timeOffErrors, "Removing time off");
    }

    refresh();
    return { status: "success", message: "Time off removed." };
  },
);
