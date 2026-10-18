"use client";

import { VideoIcon } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { getCallWindow } from "@/features/appointments/lib/appointments";
import { formatCountdown } from "@/features/video-call/lib/call-time";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

type JoinCallButtonProps = {
  startsAt: string;
  href: string;
  variant?: "default" | "secondary";
  className?: string;
};

const HOUR_MS = 60 * 60_000;

// Live from 5 minutes before the appointment until 30 minutes after it
// starts; a countdown in the last hour before that; hidden once over.
export function JoinCallButton({
  startsAt,
  href,
  variant = "default",
  className,
}: JoinCallButtonProps) {
  const now = useNow();
  const { opensAt, closesAt } = getCallWindow(startsAt);

  if (now !== 0 && now >= closesAt) return null;

  const open = now !== 0 && now >= opensAt;
  if (open) {
    return (
      <Link
        href={href}
        className={cn(
          buttonVariants({ size: "sm", variant }),
          "gap-1.5",
          className,
        )}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-current" />
        </span>
        Join call
      </Link>
    );
  }

  const soon = now !== 0 && opensAt - now < HOUR_MS;
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled
      title="The call opens 5 minutes before the appointment"
      className={cn("gap-1.5", className)}
    >
      <VideoIcon aria-hidden />
      {soon ? `Join in ${formatCountdown(opensAt - now)}` : "Join call"}
    </Button>
  );
}
