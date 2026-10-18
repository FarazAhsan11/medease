import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Patient dashboard", template: "%s | MedEase" },
};

export default async function PatientLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("patient");

  return children;
}
