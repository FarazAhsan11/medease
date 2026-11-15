"use server";

import { refresh } from "next/cache";

import { signOffReport } from "@/features/lab-reports/lib/sign-off-report.server";
import { labReportIdSchema } from "@/features/lab-reports/schemas/lab-report";
import { findLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";

// A pathologist approves a report waiting in their lab (LAB-17); the patient
// is told and can open it, with the sign-off stamped on every page.
export const signOffLabReport = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const member = await findLabMember("reports.sign");
    if (!member) {
      return formError(
        "Your role in this lab can't sign off reports.",
        "not_permitted",
      );
    }
    const parsed = labReportIdSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return formError("This report isn't in your list.", "validation_failed");
    }
    // Releasing a report is a status move, so it counts with the others.
    if (await isRateLimited(rateLimits.labBookingMoveUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const result = await signOffReport(member, parsed.data.reportId);
    refresh();
    return result;
  },
);
