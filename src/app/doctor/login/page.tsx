import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Doctor Login",
};

export default function DoctorLoginPage() {
  return (
    <AuthCard
      image="/images/auth-doctor.png"
      imageAlt="Doctor"
      switchHref="/login"
      switchLabel="Login as Patient"
      title="Login"
    >
      <LoginForm registerHref="/doctor/register" />
    </AuthCard>
  );
}
