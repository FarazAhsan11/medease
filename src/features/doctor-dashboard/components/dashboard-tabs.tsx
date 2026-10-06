import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DashboardTab = {
  value: string;
  label: string;
  content: ReactNode;
};

type DashboardTabsProps = {
  tabs: DashboardTab[];
};

export function DashboardTabs({ tabs }: DashboardTabsProps) {
  return (
    <Tabs defaultValue={tabs[0]?.value} className="gap-6">
      <TabsList
        variant="line"
        className="h-10 w-full justify-start gap-5 overflow-x-auto border-b p-0"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-none px-0.5 group-data-horizontal/tabs:after:bottom-0"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
