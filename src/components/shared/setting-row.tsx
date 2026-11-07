import type { ReactNode } from "react";

type SettingRowProps = {
  label: string;
  description: string;
  // The control's id, so the label toggles it; absent for a row with no control.
  htmlFor?: string;
  // A switch, or a badge for a setting that can't change.
  children: ReactNode;
};

export function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: SettingRowProps) {
  const Label = htmlFor ? "label" : "p";

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-muted p-3">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
