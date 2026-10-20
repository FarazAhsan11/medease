"use server";

import { refresh } from "next/cache";

import { prescriptionErrorState } from "@/features/prescriptions/lib/prescription-errors";
import { notifyPrescriptionIssued } from "@/features/prescriptions/lib/prescription-notifications";
import {
  toPrescription,
  type PrescriptionRow,
} from "@/features/prescriptions/lib/prescriptions";
import { issuePrescriptionSchema } from "@/features/prescriptions/schemas/prescription";
import { getSessionUser } from "@/lib/auth/session";
import { withFormErrors } from "@/lib/form-action.server";
import {
  formError,
  nestedValidationError,
  type FormState,
} from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// New prescriptions and edits (which replace the active version). The
// database checks the caller is the appointment's doctor and that the
// appointment can still be prescribed for.
export const issuePrescription = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = issuePrescriptionSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return nestedValidationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "doctor") {
      return formError("Only doctors can write prescriptions.", "not_doctor");
    }

    const { appointmentId, replacesId, diagnosis, advice, items } = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("issue_prescription", {
      p_appointment_id: appointmentId,
      p_items: items.map((item) => ({
        medicine: item.medicine,
        strength: item.strength,
        form: item.form,
        dose: item.dose,
        frequency: item.frequency,
        dose_times: item.doseTimes,
        meal: item.meal,
        duration_days: item.durationDays,
        instructions: item.instructions,
      })),
      p_diagnosis: diagnosis,
      p_advice: advice,
      p_replaces_id: replacesId,
    });
    if (error) return prescriptionErrorState(error);

    const row = data as PrescriptionRow & {
      patient_email: string | null;
      replaced: boolean;
    };
    await notifyPrescriptionIssued(
      toPrescription(row),
      row.patient_email,
      row.replaced,
    );

    refresh();
    return {
      status: "success",
      message: row.replaced
        ? "Prescription updated. We've emailed the patient."
        : "Prescription issued. We've emailed the patient.",
    };
  },
);
