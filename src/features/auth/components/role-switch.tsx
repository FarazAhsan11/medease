import Link from "next/link";

import { dashboards, type DashboardRole } from "@/config/dashboards";
import { cn } from "@/lib/utils";

export type AuthMode = "login" | "register";

const routes: Record<AuthMode, Record<DashboardRole, string>> = {
  login: { patient: "/login", doctor: "/login/doctor", lab: "/login/lab" },
  register: {
    patient: "/register",
    doctor: "/register/doctor",
    lab: "/register/lab",
  },
};

const roles = Object.keys(dashboards) as DashboardRole[];

type RoleSwitchProps = {
  role: DashboardRole;
  mode: AuthMode;
};

export function RoleSwitch({ role, mode }: RoleSwitchProps) {
  return (
    <nav
      aria-label="Account type"
      className="grid grid-cols-3 rounded-lg bg-muted p-1"
    >
      {roles.map((option) => (
        <Link
          key={option}
          href={routes[mode][option]}
          aria-current={option === role ? "page" : undefined}
          className={cn(
            "rounded-md py-1.5 text-center text-sm font-medium transition-colors",
            option === role
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {dashboards[option].label}
        </Link>
      ))}
    </nav>
  );
}
