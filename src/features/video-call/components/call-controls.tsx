import {
  MicIcon,
  MonitorUpIcon,
  PhoneOffIcon,
  RefreshCwIcon,
  VideoIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const controls = [
  { label: "Mute microphone", icon: MicIcon },
  { label: "Turn camera off", icon: VideoIcon },
  { label: "Share screen", icon: MonitorUpIcon },
  { label: "Refresh video", icon: RefreshCwIcon },
  { label: "End call", icon: PhoneOffIcon, danger: true },
];

export function CallControls() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-ink/70 p-2 backdrop-blur-md">
      {controls.map(({ label, icon: Icon, danger }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "flex size-11 items-center justify-center rounded-full text-white transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            danger
              ? "w-14 bg-destructive hover:bg-destructive/90"
              : "bg-white/10 hover:bg-white/20",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
