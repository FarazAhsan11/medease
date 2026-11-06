import type { ReactNode } from "react";

// A titled group of fields in a two-column form.
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid items-start gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}
