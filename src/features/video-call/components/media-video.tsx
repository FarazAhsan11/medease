"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type MediaVideoProps = {
  stream: MediaStream | null;
  label: string;
  // Your own video: muted to avoid echo, mirrored like a mirror.
  self?: boolean;
  className?: string;
};

export function MediaVideo({
  stream,
  label,
  self = false,
  className,
}: MediaVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={self}
      aria-label={label}
      className={cn(
        "size-full object-cover",
        self && "-scale-x-100",
        className,
      )}
    />
  );
}
