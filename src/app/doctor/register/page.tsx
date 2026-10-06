import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { DoctorRegisterForm } from "@/features/auth/components/doctor-register-form";

export const metadata: Metadata = {
  title: "Create a Doctor Account",
};

export default function DoctorRegisterPage() {
  return (
    <AuthCard
      image="/images/auth-doctor.png"
      imageAlt="Doctor"
      switchHref="/register"
      switchLabel="Register as Patient"
      compactSwitch
      title="Create a Doctor Account"
    >
      <DoctorRegisterForm />
    </AuthCard>
  );
}
