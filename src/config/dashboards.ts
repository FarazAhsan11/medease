import {
  BotIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  FileHeartIcon,
  FileTextIcon,
  FlaskConicalIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  PillIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StethoscopeIcon,
  TestTubesIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { NavItem } from "@/config/navigation";

export type DashboardRole = "patient" | "doctor" | "lab";

type DashboardNavItem = NavItem & { icon: LucideIcon };

export type DashboardNotification = {
  id: string;
  title: string;
  time: string;
  unread: boolean;
};

export type DashboardConfig = {
  label: string;
  home: string;
  loginHref: string;
  // Links in the header; `moreNav` overflows into a "More" menu and
  // `account` sits in the user menu.
  nav: DashboardNavItem[];
  moreNav: DashboardNavItem[];
  account: DashboardNavItem;
  notifications: DashboardNotification[];
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
    notifications: [
      {
        id: "n1",
        title: "Your CBC report is ready to view",
        time: "10 min ago",
        unread: true,
      },
      {
        id: "n2",
        title: "Reminder: Dr. Nida Ali on Fri at 11:30 AM",
        time: "2 hours ago",
        unread: true,
      },
      {
        id: "n3",
        title: "Atorvastatin refill is due in 3 days",
        time: "Yesterday",
        unread: false,
      },
    ],
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
      { title: "Messages", href: "/doctor/messages", icon: MessageSquareIcon },
      {
        title: "Availability",
        href: "/doctor/availability",
        icon: CalendarClockIcon,
      },
    ],
    moreNav: [],
    account: { title: "Profile", href: "/doctor/profile", icon: UserRoundIcon },
    notifications: [
      {
        id: "n1",
        title: "Shabna Firdos sent you a message",
        time: "5 min ago",
        unread: true,
      },
      {
        id: "n2",
        title: "New booking: Ali Khan at 12:00 PM",
        time: "1 hour ago",
        unread: false,
      },
    ],
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
    notifications: [
      {
        id: "n1",
        title: "3 new home collections booked for tomorrow",
        time: "12 min ago",
        unread: true,
      },
      {
        id: "n2",
        title: "Lipid profile results pending upload for 4 patients",
        time: "1 hour ago",
        unread: true,
      },
    ],
  },
};
