"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { recordCallEvent } from "@/features/video-call/actions/record-call-event";
import {
  CallConnection,
  type CallRole,
  type ConnectionStatus,
  type MediaState,
} from "@/features/video-call/lib/call-connection";
import type { IceServer } from "@/features/video-call/lib/ice-servers";
import {
  describeMediaError,
  isMissingDevice,
} from "@/features/video-call/lib/media-errors";
import { createClient } from "@/lib/supabase/client";

export type CallPhase =
  "preparing" | "lobby" | "media-error" | "in-call" | "ended";
export type EndReason = "you" | "time" | "closed";

type UseCallOptions = {
  appointmentId: string;
  role: CallRole;
  otherName: string;
  iceServers: IceServer[];
};

const AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
const VIDEO: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
};

async function getMedia() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("insecure");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: AUDIO,
      video: VIDEO,
    });
  } catch (error) {
    // No camera: join with audio only rather than not at all.
    if (!isMissingDevice(error)) throw error;
    return navigator.mediaDevices.getUserMedia({ audio: AUDIO });
  }
}

// Camera and microphone, the lobby → call → ended flow, and the connection.
export function useCall({
  appointmentId,
  role,
  otherName,
  iceServers,
}: UseCallOptions) {
  const [phase, setPhase] = useState<CallPhase>("preparing");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [media, setMedia] = useState<MediaState>({ micOn: true, camOn: true });
  const [status, setStatus] = useState<ConnectionStatus>("joining");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteMedia, setRemoteMedia] = useState<MediaState>({
    micOn: true,
    camOn: true,
  });
  const [endReason, setEndReason] = useState<EndReason | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRef = useRef(media);
  const connectionRef = useRef<CallConnection | null>(null);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLocalStream(null);
  }, []);

  const applyStream = useCallback((stream: MediaStream) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = stream;
    const next = { micOn: true, camOn: stream.getVideoTracks().length > 0 };
    mediaRef.current = next;
    setMedia(next);
    setLocalStream(stream);
    setMediaError(null);
    setEndReason(null);
    setPhase("lobby");
  }, []);

  const applyMediaError = useCallback((error: unknown) => {
    setMediaError(
      error instanceof Error && error.message === "insecure"
        ? "Video calls need a secure (https) connection. Open MedEase over https and try again."
        : describeMediaError(error),
    );
    setPhase("media-error");
  }, []);

  // For "Try again" and "Rejoin".
  const startMedia = useCallback(
    () => getMedia().then(applyStream, applyMediaError),
    [applyStream, applyMediaError],
  );

  useEffect(() => {
    let active = true;
    getMedia().then(
      (stream) => {
        // Left the page while the camera was starting: turn it off again.
        if (!active) stream.getTracks().forEach((track) => track.stop());
        else applyStream(stream);
      },
      (error) => active && applyMediaError(error),
    );
    return () => {
      active = false;
      void connectionRef.current?.leave();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [applyStream, applyMediaError]);

  const end = useCallback(
    async (reason: EndReason = "you") => {
      const connection = connectionRef.current;
      connectionRef.current = null;
      setEndReason(reason);
      setPhase("ended");
      setRemoteStream(null);
      // Turn the camera off as soon as the call is over.
      stopMedia();
      if (connection) {
        await connection.leave();
        void recordCallEvent(appointmentId, "ended");
      }
    },
    [appointmentId, stopMedia],
  );

  const join = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream || connectionRef.current) return;

    setStatus("joining");
    setPhase("in-call");

    const connection = new CallConnection({
      supabase: createClient(),
      appointmentId,
      role,
      iceServers,
      localStream: stream,
      media: mediaRef.current,
      events: {
        onStatus: setStatus,
        onRemoteStream: setRemoteStream,
        onRemoteMedia: setRemoteMedia,
        onPeerLeft: () => toast.info(`${otherName} left the call.`),
        onConnected: () => void recordCallEvent(appointmentId, "started"),
        onJoinFailed: () => void end("closed"),
      },
    });
    connectionRef.current = connection;
    await connection.join();
  }, [appointmentId, role, iceServers, otherName, end]);

  const toggle = useCallback((kind: "audio" | "video") => {
    const stream = streamRef.current;
    if (!stream) return;

    const tracks =
      kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
    if (tracks.length === 0) return;
    const enabled = !tracks[0].enabled;
    tracks.forEach((track) => {
      track.enabled = enabled;
    });

    const next =
      kind === "audio"
        ? { ...mediaRef.current, micOn: enabled }
        : { ...mediaRef.current, camOn: enabled };
    mediaRef.current = next;
    setMedia(next);
    connectionRef.current?.setMedia(next);
  }, []);

  return {
    phase,
    mediaError,
    localStream,
    media,
    hasCamera: (localStream?.getVideoTracks().length ?? 0) > 0,
    status,
    remoteStream,
    remoteMedia,
    endReason,
    startMedia,
    join,
    end,
    retry: () => connectionRef.current?.retry(),
    toggleMic: () => toggle("audio"),
    toggleCam: () => toggle("video"),
  };
}
