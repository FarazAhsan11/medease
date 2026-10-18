import { MicOffIcon, RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type {
  ConnectionStatus,
  MediaState,
} from "@/features/video-call/lib/call-connection";
import { MediaVideo } from "@/features/video-call/components/media-video";

type CallStageProps = {
  other: { name: string; subtitle: string };
  status: ConnectionStatus;
  remoteStream: MediaStream | null;
  remoteMedia: MediaState;
  onRetry: () => void;
  statusPill: ReactNode;
  localPreview: ReactNode;
  controls: ReactNode;
};

const messages: Partial<Record<ConnectionStatus, string>> = {
  joining: "Joining the call…",
  connecting: "Connecting…",
  reconnecting: "The connection dropped. Reconnecting…",
};

export function CallStage({
  other,
  status,
  remoteStream,
  remoteMedia,
  onRetry,
  statusPill,
  localPreview,
  controls,
}: CallStageProps) {
  const showVideo = status === "connected" && remoteStream && remoteMedia.camOn;
  const message =
    status === "waiting"
      ? `Waiting for ${other.name} to join…`
      : status === "connected" && !remoteMedia.camOn
        ? `${other.name} turned their camera off`
        : messages[status];

  return (
    <div className="relative flex h-[calc(100dvh-11rem)] min-h-[420px] items-center justify-center overflow-hidden rounded-3xl bg-linear-to-br from-ink via-ink to-primary/60">
      {/* Kept mounted while connected so audio keeps playing with camera off. */}
      {status === "connected" && remoteStream && (
        <div className={showVideo ? "absolute inset-0" : "sr-only"}>
          <MediaVideo stream={remoteStream} label={`${other.name}'s video`} />
        </div>
      )}

      {!showVideo && (
        <div className="relative flex max-w-sm flex-col items-center px-6 text-center text-white">
          <span className="relative">
            {status !== "failed" && status !== "connected" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
            )}
            <UserAvatar
              name={other.name}
              className="relative size-24 text-2xl ring-4 ring-white/10"
            />
          </span>
          <p className="mt-5 text-lg font-semibold">{other.name}</p>
          <p className="text-sm text-white/60">{other.subtitle}</p>
          {status === "failed" ? (
            <>
              <p className="mt-4 text-sm text-white/80">
                We couldn&apos;t connect to {other.name}. A network on either
                side may be blocking video calls (common on office or mobile
                networks). Try again, or switch to a different network.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={onRetry}
                className="mt-4 gap-1.5"
              >
                <RefreshCwIcon aria-hidden />
                Try again
              </Button>
            </>
          ) : (
            message && <p className="mt-4 text-sm text-white/80">{message}</p>
          )}
        </div>
      )}

      {status === "connected" && !remoteMedia.micOn && (
        <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-ink/60 px-3 py-1.5 text-xs text-white backdrop-blur-md">
          <MicOffIcon className="size-3.5" aria-hidden />
          {other.name} is muted
        </span>
      )}
      <div className="absolute top-4 left-4">{statusPill}</div>
      <div className="absolute right-4 bottom-24 sm:bottom-4">
        {localPreview}
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        {controls}
      </div>
    </div>
  );
}
