import { Loader2Icon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type AuthSubmitButtonProps = {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
};

export function AuthSubmitButton({
  pending,
  pendingLabel,
  children,
}: AuthSubmitButtonProps) {
  return (
    <Button type="submit" disabled={pending} className="mt-2 h-9 w-full gap-2">
      {pending && <Loader2Icon className="animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
