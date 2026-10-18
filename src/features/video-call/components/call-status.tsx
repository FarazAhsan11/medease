import { cn } from "@/lib/utils";

type CallStatusProps = {
  label: string;
  live: boolean;
  // "12:04 left"
  remaining: string;
  warning: boolean;
};

export function CallStatus({
  label,
  live,
  remaining,
  warning,
}: CallStatusProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-xs text-white backdrop-blur-md"
    >
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            live ? "bg-success" : "bg-warning",
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            live ? "bg-success" : "bg-warning",
          )}
        />
      </span>
      {label}
      <span className="text-white/60">·</span>
      <span
        className={cn("tabular-nums", warning && "font-semibold text-warning")}
      >
        {remaining}
      </span>
    </div>
  );
}
