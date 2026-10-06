import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default function RegisterPage() {
  return (
    <AuthCard
      image="/images/auth-patient.png"
      imageAlt="Doctor"
      switchHref="/doctor/register"
      switchLabel="Register as Doctor"
      title="Create an account"
    >
      <RegisterForm />
    </AuthCard>
  );
}
