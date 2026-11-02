import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { LegalDocumentView } from "@/features/legal/components/legal-document-view";
import { LegalNav } from "@/features/legal/components/legal-nav";
import {
  getLegalDocument,
  legalDocuments,
} from "@/features/legal/data/legal-documents";

export const dynamicParams = false;

export function generateStaticParams() {
  return legalDocuments.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  return document
    ? { title: document.title, description: document.summary }
    : {};
}

export default async function LegalDocumentPage({
  params,
}: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) notFound();

  return (
    <Container className="grid max-w-5xl grid-cols-1 gap-6 py-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:py-14">
      <LegalNav current={slug} />
      <LegalDocumentView document={document} />
    </Container>
  );
}
