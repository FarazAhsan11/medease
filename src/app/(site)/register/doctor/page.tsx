import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { DoctorRegisterForm } from "@/features/auth/components/doctor-register-form";

export const metadata: Metadata = {
  title: "Join as a doctor",
};

export default function DoctorRegisterPage() {
  return (
    <AuthShell
      role="doctor"
      mode="register"
      title="Join as a doctor"
      description="Create your profile and start accepting consultations."
    >
      <DoctorRegisterForm />
    </AuthShell>
  );
}
