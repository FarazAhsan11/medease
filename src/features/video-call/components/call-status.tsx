type CallStatusProps = {
  status: string;
  duration: string;
};

export function CallStatus({ status, duration }: CallStatusProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-xs text-white backdrop-blur-md">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-warning" />
      </span>
      {status}
      <span className="text-white/60">·</span>
      <span className="tabular-nums">{duration}</span>
    </div>
  );
}
