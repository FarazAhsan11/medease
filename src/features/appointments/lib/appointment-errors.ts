import type { PostgrestError } from "@supabase/supabase-js";

import { databaseErrorState } from "@/lib/database-errors";
import type { FormState } from "@/lib/form-state";

// The booking functions in the database raise these short codes.
const messages: Record<string, string> = {
  not_patient: "Only patient accounts can book appointments.",
  doctor_not_found: "We couldn't find this doctor.",
  not_accepting: "This doctor isn't taking new bookings right now.",
  slot_unavailable:
    "That time is no longer available. Please pick another slot.",
  slot_taken: "Someone just booked that time. Please pick another slot.",
  already_booked_with_doctor:
    "This person already has an upcoming appointment with this doctor. Cancel it first if you'd like a different time.",
  patient_time_conflict:
    "Your account already has another appointment at that time.",
  invalid_care_recipient:
    "That family member is no longer on your account. Choose someone else.",
  appointment_not_found: "We couldn't find that appointment.",
  not_cancellable: "This appointment can't be cancelled anymore.",
  already_started:
    "This appointment has already started, so it can't be cancelled.",
  not_open: "This appointment has already been updated.",
  not_started:
    "You can record the outcome once the appointment time has started.",
  has_prescription:
    "You prescribed for this appointment, so it can't be a no-show. Mark it completed, or cancel the prescription first.",
  has_lab_order:
    "You ordered lab tests for this appointment, so it can't be a no-show. Mark it completed, or cancel the lab order first.",
  not_doctor: "Only doctors can change a schedule.",
  overlapping_hours: "Some of your hours overlap. Adjust them and try again.",
  consent_required:
    "Booking needs your telemedicine consent. You can give it in Settings.",
  invalid_schedule:
    "Your schedule couldn't be saved. Check the hours and try again.",
};

export function appointmentErrorState(error: PostgrestError): FormState {
  return databaseErrorState(error, messages, "Appointment request");
}
