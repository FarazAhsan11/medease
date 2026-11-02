import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { legalRoutes } from "@/config/routes";
import { legalDocuments } from "@/features/legal/data/legal-documents";

export const metadata: Metadata = {
  title: "Legal",
};

export default function LegalPage() {
  return (
    <Container className="max-w-3xl py-10 lg:py-14">
      <h1 className="text-2xl font-semibold sm:text-3xl">Legal</h1>
      <ul className="mt-6 grid gap-3">
        {legalDocuments.map(({ slug, title, summary }) => (
          <li key={slug}>
            <Link
              href={legalRoutes.document(slug)}
              className="block rounded-xl border bg-card p-4 transition-colors hover:border-primary"
            >
              <span className="text-sm font-semibold">{title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
