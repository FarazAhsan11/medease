import { z } from "zod";

import {
  TELEMEDICINE_CONSENT,
  type ConsentDocument,
} from "../lib/consent-documents";

// An unticked checkbox isn't in the form data at all, so a missing value fails.
export const generalConsentField = z.literal("on", {
  error: "Please accept these to continue.",
});

export const telemedicineConsentField = z.literal("on", {
  error: "Please accept the Telemedicine Consent to continue.",
});

// Matches what ConsentFields shows for these documents.
export const consentFormSchema = (documents: readonly ConsentDocument[]) =>
  z.object({
    ...(documents.some((document) => document !== TELEMEDICINE_CONSENT) && {
      consent: generalConsentField,
    }),
    ...(documents.includes(TELEMEDICINE_CONSENT) && {
      telemedicineConsent: telemedicineConsentField,
    }),
  });
