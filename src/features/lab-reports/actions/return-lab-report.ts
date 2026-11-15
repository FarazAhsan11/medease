"use server";

import { refresh } from "next/cache";

import { labReportErrorMessages } from "@/features/lab-reports/lib/lab-reports";
import { returnLabReportSchema } from "@/features/lab-reports/schemas/lab-report";
import { findLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// A pathologist sends a waiting report back with a note for the lab (LAB-17).
// The patient never sees it or the note; the booking waits for a new upload.
export const returnLabReport = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = returnLabReportSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const member = await findLabMember("reports.sign");
    if (!member) {
      return formError(
        "Your role in this lab can't send reports back.",
        "not_permitted",
      );
    }
    if (await isRateLimited(rateLimits.labBookingMoveUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("return_lab_report", {
      p_report_id: parsed.data.reportId,
      p_note: parsed.data.note,
    });
    if (error) {
      if (error.message === "report_not_pending") refresh();
      return databaseErrorState(
        error,
        labReportErrorMessages,
        "Sending a lab report back",
      );
    }

    refresh();
    return {
      status: "success",
      message: "Sent back. The booking waits for a new upload.",
    };
  },
);
