export function LocalPreview() {
  return (
    <div className="relative aspect-video w-36 overflow-hidden rounded-xl border border-white/10 bg-ink shadow-lifted sm:w-48">
      <video
        autoPlay
        playsInline
        muted
        aria-label="Your camera preview"
        className="size-full object-cover"
      />
      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/70 px-1.5 py-0.5 text-[11px] text-white">
        You
      </span>
    </div>
  );
}
