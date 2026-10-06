import Link from "next/link";

import { cn } from "@/lib/utils";

export type AuthRole = "patient" | "doctor";
export type AuthMode = "login" | "register";

const routes: Record<AuthMode, Record<AuthRole, string>> = {
  login: { patient: "/login", doctor: "/doctor/login" },
  register: { patient: "/register", doctor: "/doctor/register" },
};

type RoleSwitchProps = {
  role: AuthRole;
  mode: AuthMode;
};

export function RoleSwitch({ role, mode }: RoleSwitchProps) {
  return (
    <nav
      aria-label="Account type"
      className="grid grid-cols-2 rounded-lg bg-muted p-1"
    >
      {(["patient", "doctor"] as const).map((option) => (
        <Link
          key={option}
          href={routes[mode][option]}
          aria-current={option === role ? "page" : undefined}
          className={cn(
            "rounded-md py-1.5 text-center text-sm font-medium capitalize transition-colors",
            option === role
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </Link>
      ))}
    </nav>
  );
}
