import {
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  hasCamera: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onEnd?: () => void;
};

function ControlButton({
  label,
  icon: Icon,
  onClick,
  off = false,
  danger = false,
  disabled = false,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  off?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={danger ? undefined : off}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-11 items-center justify-center rounded-full text-white transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "w-14 bg-destructive hover:bg-destructive/90"
          : off
            ? "bg-white text-ink hover:bg-white/90"
            : "bg-white/10 hover:bg-white/20",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

export function CallControls({
  micOn,
  camOn,
  hasCamera,
  onToggleMic,
  onToggleCam,
  onEnd,
}: CallControlsProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-ink/70 p-2 backdrop-blur-md">
      <ControlButton
        label={micOn ? "Mute microphone" : "Unmute microphone"}
        icon={micOn ? MicIcon : MicOffIcon}
        off={!micOn}
        onClick={onToggleMic}
      />
      <ControlButton
        label={
          !hasCamera
            ? "No camera found"
            : camOn
              ? "Turn camera off"
              : "Turn camera on"
        }
        icon={camOn ? VideoIcon : VideoOffIcon}
        off={!camOn}
        disabled={!hasCamera}
        onClick={onToggleCam}
      />
      {onEnd && (
        <ControlButton
          label="Leave call"
          icon={PhoneOffIcon}
          danger
          onClick={onEnd}
        />
      )}
    </div>
  );
}
