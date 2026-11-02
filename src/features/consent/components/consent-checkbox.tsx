import type { ReactNode } from "react";

import { fieldErrorProps } from "@/components/shared/form-field";
import { Checkbox } from "@/components/ui/checkbox";

type ConsentCheckboxProps = {
  id: string;
  name: string;
  error?: string;
  children: ReactNode;
};

export function ConsentCheckbox({
  id,
  name,
  error,
  children,
}: ConsentCheckboxProps) {
  return (
    <div className="grid gap-1.5">
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Checkbox
          id={id}
          name={name}
          value="on"
          className="mt-0.5"
          {...fieldErrorProps(id, error)}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
