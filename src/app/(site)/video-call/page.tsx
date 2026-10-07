import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CallStage } from "@/features/video-call/components/call-stage";

export const metadata: Metadata = {
  title: "Video Consultation",
};

export default function VideoCallPage() {
  return (
    <Container className="max-w-7xl py-6">
      <CallStage
        participantName="Dr. Nida Ali"
        participantRole="General Practitioner"
      />
    </Container>
  );
}
