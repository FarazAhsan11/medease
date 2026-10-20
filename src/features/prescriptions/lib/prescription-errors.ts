import type { PostgrestError } from "@supabase/supabase-js";

import {
  PRESCRIBE_WINDOW_DAYS,
  prescribeBlockMessages,
} from "@/features/prescriptions/lib/prescriptions";
import { databaseErrorState } from "@/lib/database-errors";
import type { FormState } from "@/lib/form-state";

// The prescription functions in the database raise these short codes.
const messages: Record<string, string> = {
  not_doctor: "Only doctors can write prescriptions.",
  appointment_not_found: "We couldn't find that appointment.",
  appointment_cancelled: prescribeBlockMessages.cancelled,
  appointment_no_show: prescribeBlockMessages.no_show,
  prescribe_not_started: prescribeBlockMessages.not_started,
  prescribe_window_closed: `Prescriptions can be written or edited up to ${PRESCRIBE_WINDOW_DAYS} days after the appointment.`,
  invalid_prescription:
    "Some medicine details aren't valid. Check them and try again.",
  prescription_changed:
    "This prescription was changed in another window. Refresh the page to see the latest version.",
  prescription_not_found: "We couldn't find that prescription.",
  prescription_not_active:
    "This prescription has already been cancelled or replaced. Refresh the page to see the latest version.",
  reason_required: "Tell the patient why you're cancelling it.",
};

export function prescriptionErrorState(error: PostgrestError): FormState {
  return databaseErrorState(error, messages, "Prescription request");
}
