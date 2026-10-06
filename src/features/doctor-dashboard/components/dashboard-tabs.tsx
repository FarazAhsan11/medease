"use client";

import {
  CalendarDaysIcon,
  MessagesSquareIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { WelcomeBanner } from "@/features/doctor-dashboard/components/welcome-banner";

export type DashboardTab = "Appointments" | "Patients" | "Messages" | "Profile";

const tabIcons: Record<DashboardTab, LucideIcon> = {
  Appointments: CalendarDaysIcon,
  Patients: UsersIcon,
  Messages: MessagesSquareIcon,
  Profile: UserRoundIcon,
};

type DashboardTabsProps = {
  doctorName: string;
  panels: Record<DashboardTab, ReactNode>;
};

export function DashboardTabs({ doctorName, panels }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("Appointments");
  const tabs = Object.keys(panels) as DashboardTab[];

  return (
    <div className="flex min-h-screen flex-col">
      <nav aria-label="Dashboard sections">
        <h2 className="mt-6 mb-5 text-[28.8px] font-bold">Doctor Dashboard</h2>
        <ul role="tablist" className="flex flex-wrap">
          {tabs.map((tab) => {
            const Icon = tabIcons[tab];

            return (
              <li key={tab} className="px-[15px] py-2.5">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className="inline-flex items-center gap-1 rounded-[5px] bg-brand-sky px-5 py-2.5 text-[13.33px] text-white hover:bg-brand-sky-hover"
                >
                  <Icon className="size-[13px]" aria-hidden />
                  {tab}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div role="tabpanel">
        <WelcomeBanner doctorName={doctorName} />
        {panels[activeTab]}
      </div>
    </div>
  );
}
