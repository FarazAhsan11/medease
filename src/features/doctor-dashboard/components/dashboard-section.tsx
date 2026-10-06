import type { ReactNode } from "react";

type DashboardSectionProps = {
  title: string;
  children: ReactNode;
};

export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <section>
      <h2 className="mt-6 mb-5 text-[28.8px] font-bold">{title}</h2>
      {children}
    </section>
  );
}
