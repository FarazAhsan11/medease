import Link from "next/link";

import { legalRoutes } from "@/config/routes";

import type { ConsentDocument } from "../lib/consent-documents";

const links: Record<ConsentDocument, { label: string; href: string }> = {
  terms: { label: "Terms of Use", href: legalRoutes.terms },
  privacy: { label: "Privacy Policy", href: legalRoutes.privacy },
  "telemedicine-consent": {
    label: "Telemedicine Consent",
    href: legalRoutes.telemedicineConsent,
  },
  "partner-terms": { label: "Partner Terms", href: legalRoutes.partnerTerms },
};

// Opens in a new tab so a half-filled form isn't lost.
export function ConsentDocumentLink({
  document,
}: {
  document: ConsentDocument;
}) {
  const { label, href } = links[document];

  return (
    <Link
      href={href}
      target="_blank"
      className="font-medium text-primary hover:underline"
    >
      {label}
    </Link>
  );
}
