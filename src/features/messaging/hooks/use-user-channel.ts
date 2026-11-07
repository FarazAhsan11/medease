"use client";

import { useEffect, useRef } from "react";

import {
  subscribeToUserChannel,
  type UserChannelListener,
} from "@/features/messaging/lib/user-channel";

// Listens on the signed-in person's live channel for as long as the component
// is mounted. The handlers can change on every render without resubscribing.
export function useUserChannel(userId: string, handlers: UserChannelListener) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(
    () =>
      subscribeToUserChannel(userId, {
        onMessage: (message) => latest.current.onMessage?.(message),
        onRead: (receipt) => latest.current.onRead?.(receipt),
        onLive: (when) => latest.current.onLive?.(when),
      }),
    [userId],
  );
}
