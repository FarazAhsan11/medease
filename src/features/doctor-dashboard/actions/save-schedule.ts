"use server";

import { refresh } from "next/cache";

import { appointmentErrorState } from "@/features/appointments/lib/appointment-errors";
import { scheduleSchema } from "@/features/doctor-dashboard/schemas/schedule";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

function parseRanges(value: FormDataEntryValue | null) {
  try {
    return JSON.parse(String(value ?? "[]")) as unknown;
  } catch {
    return null;
  }
}

export const saveSchedule = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = scheduleSchema.safeParse({
      ranges: parseRanges(formData.get("ranges")),
      slotMinutes: formData.get("slotMinutes"),
      accepting: formData.get("accepting"),
      fee: formData.get("fee"),
    });
    if (!parsed.success) {
      const rangeError = parsed.error.issues.find(
        (issue) => issue.path[0] === "ranges",
      );
      return rangeError
        ? formError(rangeError.message, "invalid_schedule")
        : validationError(parsed.error);
    }

    // The database function replaces the week in one transaction and checks
    // the caller is this doctor.
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_doctor_schedule", {
      p_ranges: parsed.data.ranges,
      p_slot_minutes: parsed.data.slotMinutes,
      p_accepting: parsed.data.accepting,
      p_fee: parsed.data.fee,
    });
    if (error) return appointmentErrorState(error);

    refresh();
    return {
      status: "success",
      message: parsed.data.accepting
        ? "Schedule saved. Patients can book these hours now."
        : "Schedule saved. New bookings are paused.",
    };
  },
);
