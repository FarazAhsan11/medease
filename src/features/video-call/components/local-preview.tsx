import { VideoOffIcon } from "lucide-react";

import { MediaVideo } from "@/features/video-call/components/media-video";

type LocalPreviewProps = {
  stream: MediaStream | null;
  camOn: boolean;
};

export function LocalPreview({ stream, camOn }: LocalPreviewProps) {
  return (
    <div className="relative aspect-video w-32 overflow-hidden rounded-xl border border-white/10 bg-ink shadow-lifted sm:w-48">
      <MediaVideo stream={stream} label="Your camera" self />
      {!camOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink text-white/60">
          <VideoOffIcon className="size-5" aria-hidden />
        </div>
      )}
      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/70 px-1.5 py-0.5 text-[11px] text-white">
        You
      </span>
    </div>
  );
}
