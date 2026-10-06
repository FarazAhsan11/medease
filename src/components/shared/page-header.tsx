import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="border-b bg-card">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:py-10">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1.5 text-2xl font-semibold sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </Container>
    </div>
  );
}
