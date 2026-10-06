import { cn } from "@/lib/utils";

type VideoTileProps = {
  label: string;
  className?: string;
  muted?: boolean;
  controls?: boolean;
};

export function VideoTile({
  label,
  className,
  muted = false,
  controls = false,
}: VideoTileProps) {
  return (
    <div
      className={cn(
        "relative min-h-[300px] overflow-hidden rounded-xl bg-black shadow-call",
        className,
      )}
    >
      <video
        autoPlay
        playsInline
        muted={muted}
        controls={controls}
        className="size-full bg-black object-cover"
      />
      <div className="absolute bottom-2.5 left-2.5 rounded bg-surface-overlay px-2.5 py-[5px] text-sm text-white">
        {label}
      </div>
    </div>
  );
}
