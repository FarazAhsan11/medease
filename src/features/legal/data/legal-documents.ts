import type { LegalDocument } from "./legal-types";
import { partnerTerms } from "./partner-terms";
import { privacyPolicy } from "./privacy-policy";
import { refundPolicy } from "./refund-policy";
import { telemedicineConsent } from "./telemedicine-consent";
import { termsOfUse } from "./terms-of-use";

export const legalDocuments: LegalDocument[] = [
  privacyPolicy,
  termsOfUse,
  telemedicineConsent,
  refundPolicy,
  partnerTerms,
];

export function getLegalDocument(slug: string) {
  return legalDocuments.find((document) => document.slug === slug);
}
