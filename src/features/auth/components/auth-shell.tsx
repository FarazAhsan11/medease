import type { ReactNode } from "react";

import { AuthVisual } from "@/features/auth/components/auth-visual";
import {
  RoleSwitch,
  type AuthMode,
  type AuthRole,
} from "@/features/auth/components/role-switch";

type AuthShellProps = {
  title: string;
  description: string;
  role: AuthRole;
  mode: AuthMode;
  children: ReactNode;
};

const visuals: Record<
  AuthRole,
  { image: string; quote: string; author: string }
> = {
  patient: {
    image: "/images/auth-patient.png",
    quote:
      "Booking a specialist used to take days. With MedEase it took me five minutes.",
    author: "Sarah W., patient",
  },
  doctor: {
    image: "/images/auth-doctor.png",
    quote:
      "MedEase lets me focus on my patients while it handles scheduling and records.",
    author: "Dr. Nida Ali, general practitioner",
  },
};

export function AuthShell({
  title,
  description,
  role,
  mode,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] gap-6 p-4 lg:grid-cols-2">
      <AuthVisual {...visuals[role]} />
      <div className="flex items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <RoleSwitch role={role} mode={mode} />
          <h1 className="mt-8 text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
