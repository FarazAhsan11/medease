"use server";

import { refresh } from "next/cache";

import { prescriptionErrorState } from "@/features/prescriptions/lib/prescription-errors";
import { notifyPrescriptionCancelled } from "@/features/prescriptions/lib/prescription-notifications";
import {
  toPrescription,
  type PrescriptionRow,
} from "@/features/prescriptions/lib/prescriptions";
import { cancelPrescriptionSchema } from "@/features/prescriptions/schemas/prescription";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Only the prescribing doctor can cancel, and only the active version; the
// database checks both.
export const cancelPrescription = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = cancelPrescriptionSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_prescription", {
      p_prescription_id: parsed.data.prescriptionId,
      p_reason: parsed.data.reason,
    });
    if (error) return prescriptionErrorState(error);

    const row = data as PrescriptionRow & { patient_email: string | null };
    await notifyPrescriptionCancelled(toPrescription(row), row.patient_email);

    refresh();
    return {
      status: "success",
      message: "Prescription cancelled. We've emailed the patient.",
    };
  },
);
