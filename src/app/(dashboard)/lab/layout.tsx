import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PreviewNotice } from "@/components/shared/preview-notice";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Lab dashboard", template: "%s | MedEase" },
};

export default async function LabLayout({ children }: { children: ReactNode }) {
  await requireRole("lab");

  return (
    <>
      <PreviewNotice feature="The lab dashboard" />
      {children}
    </>
  );
}
