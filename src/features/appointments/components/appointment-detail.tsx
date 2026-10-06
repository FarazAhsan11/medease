import type { ReactNode } from "react";

type AppointmentDetailProps = {
  label: string;
  children: ReactNode;
};

export function AppointmentDetail({ label, children }: AppointmentDetailProps) {
  return (
    <div className="mb-[15px]">
      <span className="mb-[5px] block font-bold text-ink-faint">{label}</span>
      <span className="text-base font-bold text-ink-body">{children}</span>
    </div>
  );
}
