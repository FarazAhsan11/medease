import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Container className="space-y-6 py-6 lg:py-8">{children}</Container>;
}
