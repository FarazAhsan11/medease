import { TriangleAlertIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// SUP-03. MedEase is never the way to get urgent help.
export function EmergencyNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs", className)}>
      <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        Not for emergencies. Call <strong>Rescue 1122</strong> or{" "}
        <strong>Edhi 115</strong>.
      </span>
    </p>
  );
}
