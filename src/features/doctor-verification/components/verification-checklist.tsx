import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import Link from "next/link";

import { PanelCard } from "@/components/shared/panel-card";
import { doctorRoutes } from "@/config/routes";
import type { DoctorVerification } from "@/features/doctor-verification/data/verification";
import { cn } from "@/lib/utils";

export function VerificationChecklist({
  verification,
}: {
  verification: DoctorVerification;
}) {
  const { documents, hasHours, status } = verification;
  const items = [
    { label: "Profile photo", done: documents.photo },
    { label: "PMDC license", done: documents.license },
    { label: "Degree certificate", done: documents.degree },
    {
      label: "Weekly hours",
      done: hasHours,
      href: doctorRoutes.availability,
    },
    { label: "Verified by our team", done: status === "approved" },
  ];

  return (
    <PanelCard title="Setup checklist" className="h-fit">
      <ul className="grid gap-3 p-5 text-sm">
        {items.map((item) => {
          const Icon = item.done ? CheckCircle2Icon : CircleIcon;

          return (
            <li key={item.label} className="flex items-center gap-2.5">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  item.done ? "text-success" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                {item.label}
                <span className="sr-only">
                  {item.done ? " (done)" : " (to do)"}
                </span>
              </span>
              {!item.done && item.href && (
                <Link
                  href={item.href}
                  className="text-xs text-primary hover:underline"
                >
                  Set up
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
