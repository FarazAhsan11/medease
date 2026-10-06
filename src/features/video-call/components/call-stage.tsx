import { UserAvatar } from "@/components/shared/user-avatar";
import { CallControls } from "@/features/video-call/components/call-controls";
import { CallStatus } from "@/features/video-call/components/call-status";
import { LocalPreview } from "@/features/video-call/components/local-preview";

type CallStageProps = {
  participantName: string;
  participantRole: string;
};

export function CallStage({
  participantName,
  participantRole,
}: CallStageProps) {
  return (
    <div className="relative flex h-[calc(100dvh-8rem)] min-h-[480px] items-center justify-center overflow-hidden rounded-3xl bg-linear-to-br from-ink via-ink to-primary/60">
      <video
        autoPlay
        playsInline
        aria-label={`${participantName}'s video`}
        className="absolute inset-0 size-full object-cover"
      />

      <div className="relative flex flex-col items-center text-center text-white">
        <span className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
          <UserAvatar
            name={participantName}
            className="relative size-24 text-2xl ring-4 ring-white/10"
          />
        </span>
        <p className="mt-5 text-lg font-semibold">{participantName}</p>
        <p className="text-sm text-white/60">{participantRole}</p>
        <p className="mt-4 text-sm text-white/80">
          Waiting for {participantName} to join…
        </p>
      </div>

      <div className="absolute top-4 left-4">
        <CallStatus status="Connecting" duration="00:00" />
      </div>
      <div className="absolute right-4 bottom-24 sm:bottom-4">
        <LocalPreview />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <CallControls />
      </div>
    </div>
  );
}
