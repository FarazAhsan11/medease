import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | MedEase" },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("admin");

  return children;
}
