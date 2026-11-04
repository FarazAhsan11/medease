"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dashboards } from "@/config/dashboards";
import { patientRoutes } from "@/config/routes";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

import { getPendingConsents } from "../data/consents";
import { TELEMEDICINE_CONSENT } from "../lib/consent-documents";
import { withVersions } from "../lib/consent-versions";
import { consentFormSchema } from "../schemas/consent";

const messages: Record<string, string> = {
  invalid_consent:
    "We couldn't save that. Please reload the page and try again.",
  not_consented: "You haven't given this consent.",
  upcoming_appointments:
    "You have a visit booked. Cancel it first, then withdraw your consent.",
};

const consentError = (error: Parameters<typeof databaseErrorState>[0]) =>
  databaseErrorState(error, messages, "Consent change");

// Not requireRole: that redirects to the page this form is on.
export const acceptConsents = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const user = await getSessionUser();
    if (!user) redirect(dashboards.patient.loginHref);

    const pending = await getPendingConsents(user.role);
    const parsed = consentFormSchema(pending).safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    if (pending.length > 0) {
      const supabase = await createClient();
      const { error } = await supabase.rpc("accept_consents", {
        p_consents: withVersions(pending),
      });
      if (error) return consentError(error);
    }

    // While this page was open the header's links were prefetched, and each
    // answered with a redirect back here. Drop them, or the first clicks after
    // accepting bounce between the page and /consent.
    revalidatePath("/", "layout");
    redirect(dashboards[user.role].home);
  },
);

export const giveTelemedicineConsent = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    await requireRole("patient");

    const parsed = consentFormSchema([TELEMEDICINE_CONSENT]).safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_consents", {
      p_consents: withVersions([TELEMEDICINE_CONSENT]),
    });
    if (error) return consentError(error);

    await setFlash("success", "Your consent is saved.");
    redirect(patientRoutes.settings);
  },
);

export const withdrawTelemedicineConsent = withFormErrors<FormState, FormData>(
  async () => {
    await requireRole("patient");

    const supabase = await createClient();
    const { error } = await supabase.rpc("withdraw_consent", {
      p_document: TELEMEDICINE_CONSENT,
    });
    if (error) return consentError(error);

    await setFlash("success", "Your consent is withdrawn.");
    redirect(patientRoutes.settings);
  },
);
