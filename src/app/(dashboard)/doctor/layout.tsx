import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Doctor dashboard", template: "%s | MedEase" },
};

export default async function DoctorLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("doctor");

  return children;
}
