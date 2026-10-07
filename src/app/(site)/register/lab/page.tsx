import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LabRegisterForm } from "@/features/auth/components/lab-register-form";

export const metadata: Metadata = {
  title: "Register your lab",
};

export default function LabRegisterPage() {
  return (
    <AuthShell
      role="lab"
      mode="register"
      title="Register your laboratory"
      description="List your tests, accept bookings, and deliver reports online."
    >
      <LabRegisterForm />
    </AuthShell>
  );
}
