import {
  BotIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  FileHeartIcon,
  FileTextIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  PillIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  StethoscopeIcon,
  TestTubesIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { NavItem } from "@/config/navigation";

export type DashboardRole = "patient" | "doctor" | "lab" | "admin";

type DashboardNavItem = NavItem & { icon: LucideIcon };

export type DashboardConfig = {
  label: string;
  home: string;
  loginHref: string;
  // Links in the header; `moreNav` overflows into a "More" menu and
  // `account` sits in the user menu. Messages has its own icon in the header,
  // with the unread count, so it isn't listed here.
  nav: DashboardNavItem[];
  moreNav: DashboardNavItem[];
  account: DashboardNavItem;
};

export const dashboards: Record<DashboardRole, DashboardConfig> = {
  patient: {
    label: "Patient",
    home: "/patient",
    loginHref: "/login",
    nav: [
      { title: "Overview", href: "/patient", icon: LayoutDashboardIcon },
      {
        title: "Find a doctor",
        href: "/patient/find-doctor",
        icon: StethoscopeIcon,
      },
      {
        title: "Appointments",
        href: "/patient/appointments",
        icon: CalendarDaysIcon,
      },
      {
        title: "Lab tests",
        href: "/patient/lab-tests",
        icon: FlaskConicalIcon,
      },
      { title: "Talk to AI", href: "/patient/talk-to-ai", icon: BotIcon },
    ],
    moreNav: [
      {
        title: "Medicines",
        href: "/patient/medicines",
        icon: ShoppingBagIcon,
      },
      {
        title: "Prescriptions",
        href: "/patient/prescriptions",
        icon: PillIcon,
      },
      {
        title: "Health records",
        href: "/patient/records",
        icon: FileHeartIcon,
      },
    ],
    account: {
      title: "Settings",
      href: "/patient/settings",
      icon: SettingsIcon,
    },
  },
  doctor: {
    label: "Doctor",
    home: "/doctor",
    loginHref: "/login/doctor",
    nav: [
      { title: "Overview", href: "/doctor", icon: LayoutDashboardIcon },
      {
        title: "Appointments",
        href: "/doctor/appointments",
        icon: CalendarDaysIcon,
      },
      { title: "Patients", href: "/doctor/patients", icon: UsersIcon },
      {
        title: "Availability",
        href: "/doctor/availability",
        icon: CalendarClockIcon,
      },
    ],
    moreNav: [],
    account: { title: "Profile", href: "/doctor/profile", icon: UserRoundIcon },
  },
  lab: {
    label: "Laboratory",
    home: "/lab",
    loginHref: "/login/lab",
    nav: [
      { title: "Overview", href: "/lab", icon: LayoutDashboardIcon },
      { title: "Bookings", href: "/lab/bookings", icon: ClipboardListIcon },
      { title: "Test catalog", href: "/lab/tests", icon: TestTubesIcon },
      { title: "Reports", href: "/lab/reports", icon: FileTextIcon },
    ],
    moreNav: [],
    account: {
      title: "Lab profile",
      href: "/lab/profile",
      icon: SettingsIcon,
    },
  },
  admin: {
    label: "Admin",
    home: "/admin",
    loginHref: "/login/admin",
    nav: [
      { title: "Verification", href: "/admin", icon: ShieldCheckIcon },
      { title: "Audit log", href: "/admin/audit-log", icon: ScrollTextIcon },
    ],
    moreNav: [],
    account: {
      title: "Two-factor",
      href: "/two-factor",
      icon: KeyRoundIcon,
    },
  },
};
