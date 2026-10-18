import { LockKeyholeIcon, VideoOffIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { MediaVideo } from "@/features/video-call/components/media-video";

type CallLobbyProps = {
  other: { name: string; subtitle: string };
  stream: MediaStream | null;
  camOn: boolean;
  controls: ReactNode;
  // "Today, 10:30 AM – 11:00 AM"
  schedule: string;
  canJoin: boolean;
  // e.g. "Opens in 4:12"
  joinHint: string | null;
  onJoin: () => void;
};

// Check your camera and mic before going in.
export function CallLobby({
  other,
  stream,
  camOn,
  controls,
  schedule,
  canJoin,
  joinHint,
  onJoin,
}: CallLobbyProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
      <div className="relative aspect-video overflow-hidden rounded-3xl bg-ink">
        <MediaVideo stream={stream} label="Your camera preview" self />
        {!camOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink text-white/70">
            <VideoOffIcon className="size-8" aria-hidden />
            <p className="text-sm">Your camera is off</p>
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {controls}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Video consultation with</p>
        <h1 className="mt-1 text-xl font-semibold">{other.name}</h1>
        <p className="text-sm text-muted-foreground">{other.subtitle}</p>
        <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">{schedule}</p>
        <Button
          type="button"
          onClick={onJoin}
          disabled={!canJoin}
          className="mt-5 h-10 w-full"
        >
          {canJoin ? "Join call" : (joinHint ?? "Join call")}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          The call opens 5 minutes before the appointment and lasts up to 30
          minutes.
        </p>
        <p className="mt-4 flex items-start gap-1.5 border-t pt-4 text-xs text-muted-foreground">
          <LockKeyholeIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Video and audio go directly between you and {other.name}; MedEase
          doesn&apos;t record calls.
        </p>
      </div>
    </div>
  );
}
