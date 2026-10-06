import type { ReactNode } from "react";

type ProfileFieldProps = {
  label: string;
  children: ReactNode;
};

export function ProfileField({ label, children }: ProfileFieldProps) {
  return (
    <label className="mb-4 flex flex-col">
      <span className="mb-2 font-semibold text-ink-label">{label}:</span>
      {children}
    </label>
  );
}
