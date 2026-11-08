"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { setCatalogListed } from "@/features/lab-catalog/actions/set-catalog-listed";
import { NETWORK_ERROR_MESSAGE } from "@/lib/errors";
import { initialFormState } from "@/lib/form-state";

type CatalogListedSwitchProps = {
  kind: "test" | "package";
  id: string;
  listed: boolean;
  label: string;
};

// Flips at once; the page refresh after the save brings the real value, so a
// failed save springs back.
export function CatalogListedSwitch({
  kind,
  id,
  listed,
  label,
}: CatalogListedSwitchProps) {
  const [checked, setChecked] = useOptimistic(listed);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label={label}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setChecked(next);
          try {
            const result = await setCatalogListed(initialFormState, {
              kind,
              id,
              listed: next,
            });
            if (result.status === "error" && result.message) {
              toast.error(result.message);
            }
          } catch {
            toast.error(NETWORK_ERROR_MESSAGE);
          }
        })
      }
    />
  );
}
