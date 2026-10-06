import type { ReactNode } from "react";

type InfoCardProps = {
  title: string;
  children: ReactNode;
};

export function InfoCard({ title, children }: InfoCardProps) {
  return (
    <div className="rounded-lg border-l-4 border-link bg-surface-subtle p-6">
      <h4 className="mb-4 border-b-2 border-line-subtle pb-2 text-[1.2rem] font-bold text-link">
        {title}
      </h4>
      <dl>{children}</dl>
    </div>
  );
}
