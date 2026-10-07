import type { Metadata } from "next";

import { CallStage } from "@/features/video-call/components/call-stage";

export const metadata: Metadata = {
  title: "Video consultation",
};

export default function PatientConsultationPage() {
  return (
    <CallStage
      participantName="Dr. Nida Ali"
      participantRole="General Practitioner"
    />
  );
}
