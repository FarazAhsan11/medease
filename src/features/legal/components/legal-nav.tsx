import Link from "next/link";

import { legalRoutes } from "@/config/routes";
import { cn } from "@/lib/utils";

import { legalDocuments } from "../data/legal-documents";

export function LegalNav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Legal documents"
      className="lg:sticky lg:top-24 lg:self-start"
    >
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {legalDocuments.map(({ slug, title }) => (
          <li key={slug} className="shrink-0">
            <Link
              href={legalRoutes.document(slug)}
              aria-current={slug === current ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                slug === current
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
