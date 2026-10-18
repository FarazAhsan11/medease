"use client";

import {
  CalendarClockIcon,
  CameraOffIcon,
  Loader2Icon,
  PhoneOffIcon,
  TimerOffIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { getCallWindow } from "@/features/appointments/lib/appointments";
import { CallControls } from "@/features/video-call/components/call-controls";
import { CallLobby } from "@/features/video-call/components/call-lobby";
import { CallNotice } from "@/features/video-call/components/call-notice";
import { CallStage } from "@/features/video-call/components/call-stage";
import { CallStatus } from "@/features/video-call/components/call-status";
import { LocalPreview } from "@/features/video-call/components/local-preview";
import { useCall } from "@/features/video-call/hooks/use-call";
import type {
  CallRole,
  ConnectionStatus,
} from "@/features/video-call/lib/call-connection";
import { formatCountdown } from "@/features/video-call/lib/call-time";
import type { IceServer } from "@/features/video-call/lib/ice-servers";
import { useNow } from "@/hooks/use-now";
import { formatDate, formatTime } from "@/lib/datetime";

type CallRoomProps = {
  appointmentId: string;
  role: CallRole;
  other: { name: string; subtitle: string };
  startsAt: string;
  timezone: string;
  iceServers: IceServer[];
  backHref: string;
};

const statusLabels: Record<ConnectionStatus, string> = {
  joining: "Joining",
  waiting: "Waiting",
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  failed: "Not connected",
};

const WARNING_MS = 5 * 60_000;

export function CallRoom({
  appointmentId,
  role,
  other,
  startsAt,
  timezone,
  iceServers,
  backHref,
}: CallRoomProps) {
  const now = useNow();
  const { opensAt, closesAt } = getCallWindow(startsAt);
  const call = useCall({
    appointmentId,
    role,
    otherName: other.name,
    iceServers,
  });
  const { phase, end } = call;

  // Hang up when the window closes (also turns off a waiting lobby camera)
  // and warn five minutes before.
  useEffect(() => {
    if (phase !== "lobby" && phase !== "in-call") return;
    const untilClose = closesAt - Date.now();
    const timers = [
      setTimeout(() => void end("time"), Math.max(0, untilClose)),
    ];
    if (phase === "in-call" && untilClose > WARNING_MS) {
      timers.push(
        setTimeout(
          () =>
            toast.warning(
              "5 minutes left. The call ends automatically at the time limit.",
            ),
          untilClose - WARNING_MS,
        ),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [phase, closesAt, end]);

  const backLink = (
    <Link href={backHref} className={buttonVariants({ variant: "secondary" })}>
      Back to appointments
    </Link>
  );

  if (phase === "preparing") {
    return (
      <CallNotice
        icon={Loader2Icon}
        title="Starting your camera…"
        description="Your browser may ask for permission to use your camera and microphone."
      />
    );
  }

  if (phase === "media-error") {
    return (
      <CallNotice
        icon={CameraOffIcon}
        title="We can't reach your camera or microphone"
        description={call.mediaError}
      >
        <Button type="button" onClick={() => void call.startMedia()}>
          Try again
        </Button>
        {backLink}
      </CallNotice>
    );
  }

  if (phase === "ended") {
    const windowOpen = now !== 0 && now < closesAt;
    const notices = {
      time: {
        icon: TimerOffIcon,
        title: "The call time is over",
        description: "Calls last up to 30 minutes from the appointment time.",
      },
      closed: {
        icon: CalendarClockIcon,
        title: "This call isn't open",
        description:
          "The call may have ended, the appointment may have changed, or your session expired. Refresh and try again.",
      },
      you: {
        icon: PhoneOffIcon,
        title: "You left the call",
        description: windowOpen
          ? `You can rejoin until ${formatTime(new Date(closesAt), timezone)}.`
          : "The call window has closed.",
      },
    } as const;
    const notice = notices[call.endReason ?? "you"];

    return (
      <CallNotice
        icon={notice.icon}
        title={notice.title}
        description={notice.description}
      >
        {windowOpen && call.endReason === "you" && (
          <Button type="button" onClick={() => void call.startMedia()}>
            Rejoin
          </Button>
        )}
        {backLink}
      </CallNotice>
    );
  }

  const controls = (
    <CallControls
      micOn={call.media.micOn}
      camOn={call.media.camOn}
      hasCamera={call.hasCamera}
      onToggleMic={call.toggleMic}
      onToggleCam={call.toggleCam}
      onEnd={phase === "in-call" ? () => void end("you") : undefined}
    />
  );

  if (phase === "lobby") {
    const canJoin = now !== 0 && now >= opensAt && now < closesAt;
    return (
      <CallLobby
        other={other}
        stream={call.localStream}
        camOn={call.media.camOn}
        controls={controls}
        schedule={`${formatDate(startsAt, timezone)}, ${formatTime(startsAt, timezone)}`}
        canJoin={canJoin}
        joinHint={
          now !== 0 && now < opensAt
            ? `Opens in ${formatCountdown(opensAt - now)}`
            : null
        }
        onJoin={() => void call.join()}
      />
    );
  }

  const remaining = closesAt - now;
  return (
    <CallStage
      other={other}
      status={call.status}
      remoteStream={call.remoteStream}
      remoteMedia={call.remoteMedia}
      onRetry={call.retry}
      statusPill={
        <CallStatus
          label={statusLabels[call.status]}
          live={call.status === "connected"}
          remaining={now === 0 ? "" : `${formatCountdown(remaining)} left`}
          warning={now !== 0 && remaining <= WARNING_MS}
        />
      }
      localPreview={
        <LocalPreview stream={call.localStream} camOn={call.media.camOn} />
      }
      controls={controls}
    />
  );
}
