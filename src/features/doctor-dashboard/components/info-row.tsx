import type { ReactNode } from "react";

type InfoRowProps = {
  label: string;
  children: ReactNode;
};

export function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="mb-[0.8rem] flex justify-between border-b border-line-subtle py-2 last:mb-0 last:border-b-0">
      <dt className="min-w-[120px] font-semibold text-ink-label">{label}:</dt>
      <dd className="flex-1 text-right text-ink-body">{children}</dd>
    </div>
  );
}
