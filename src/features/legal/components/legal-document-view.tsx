import Link from "next/link";

import type { LegalDocument } from "../data/legal-types";
import { LegalSection } from "./legal-section";

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="min-w-0">
      <h1 className="text-2xl font-semibold sm:text-3xl">{document.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{document.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Version {document.version}, updated {document.updated}
      </p>

      <div className="mt-8 space-y-7">
        {document.sections.map((section, index) => (
          <LegalSection
            key={section.title}
            number={index + 1}
            section={section}
          />
        ))}
      </div>

      <footer className="mt-10 border-t pt-5 text-sm text-muted-foreground">
        <p>
          Questions about this document?{" "}
          <Link
            href="/contact"
            className="font-medium text-primary hover:underline"
          >
            Contact us
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}
