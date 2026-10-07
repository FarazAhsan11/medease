import type { Metadata } from "next";

import { CallStage } from "@/features/video-call/components/call-stage";

export const metadata: Metadata = {
  title: "Video consultation",
};

export default function DoctorConsultationPage() {
  return (
    <CallStage participantName="Shabna Firdos" participantRole="Patient" />
  );
}
