"use server";

import { refresh } from "next/cache";

import { sendLabInviteEmail } from "@/features/auth/lib/auth-emails";
import { getLabStaffMember } from "@/features/lab-staff/data/lab-staff";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { labRoleLabels } from "@/features/lab-staff/lib/lab-permissions";
import { labStaffErrorMessages } from "@/features/lab-staff/lib/lab-staff";
import { labStaffMemberSchema } from "@/features/lab-staff/schemas/lab-staff";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";

// A new link for someone who hasn't accepted yet; it replaces the old one.
export const resendLabInvite = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = labStaffMemberSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return formError(labStaffErrorMessages.member_not_found, "not_found");
    }

    const member = await requireLabMember("staff");
    if (await isRateLimited(rateLimits.labStaffUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    // Read through get_lab_staff, so only the admin's own invitations.
    const invitee = await getLabStaffMember(parsed.data.userId);
    if (!invitee || invitee.status !== "invited") {
      refresh();
      return formError(labStaffErrorMessages.member_not_found, "not_found");
    }

    const status = await sendLabInviteEmail(
      { userId: invitee.userId, email: invitee.email, name: invitee.name },
      member.labName,
      labRoleLabels[invitee.role],
    );
    if (status === "cooldown") {
      return formError(
        "An invitation was just sent. Wait a minute before sending another.",
        status,
      );
    }
    if (status === "rate_limited") {
      return formError(RATE_LIMITED_MESSAGE, status);
    }

    refresh();
    return {
      status: "success",
      message: `A new invitation is on its way to ${invitee.email}.`,
    };
  },
);
