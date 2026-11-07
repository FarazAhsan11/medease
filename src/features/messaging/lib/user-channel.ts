"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import type { MessageRow } from "@/features/messaging/lib/messaging";
import { createClient } from "@/lib/supabase/client";

// MSG-02. Each person's live updates arrive by Broadcast on one private
// channel, "user:<id>", sent by the database functions themselves. Everything
// on the page that needs them (the header badge, the inbox, the open
// conversation) shares one subscription per tab: the payloads carry what
// changed, so nothing has to be fetched again unless the connection dropped.

export type ReadReceipt = {
  conversation_id: string;
  reader_id: string;
  read_at: string;
  count: number;
};

export type UserChannelListener = {
  onMessage?: (message: MessageRow) => void;
  onRead?: (receipt: ReadReceipt) => void;
  // Called once the channel is live for this listener: "first" when it joins
  // (straight away if the channel was already up), "reconnect" after the
  // connection dropped and came back, when events may have been missed.
  onLive?: (when: "first" | "reconnect") => void;
};

type Entry = {
  channel: RealtimeChannel | null;
  listeners: Set<UserChannelListener>;
  live: boolean;
  everLive: boolean;
  stopped: boolean;
};

const entries = new Map<string, Entry>();
// Leaving takes a round trip, and until it's done the client hands back the
// same closing channel for the topic, so joining again waits for it.
const leaving = new Map<string, Promise<unknown>>();

function open(userId: string, entry: Entry) {
  const supabase = createClient();

  void (async () => {
    // Private channels are authorised with the user's token: without setAuth()
    // the join goes out as anon and is refused without an error.
    await Promise.all([leaving.get(userId), supabase.realtime.setAuth()]);
    if (entry.stopped) return;

    entry.channel = supabase
      .channel(`user:${userId}`, { config: { private: true } })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        for (const listener of entry.listeners) {
          listener.onMessage?.(payload as MessageRow);
        }
      })
      .on("broadcast", { event: "read" }, ({ payload }) => {
        for (const listener of entry.listeners) {
          listener.onRead?.(payload as ReadReceipt);
        }
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          entry.live = false;
          return;
        }
        const when = entry.everLive ? "reconnect" : "first";
        entry.live = true;
        entry.everLive = true;
        for (const listener of entry.listeners) listener.onLive?.(when);
      });
  })();
}

export function subscribeToUserChannel(
  userId: string,
  listener: UserChannelListener,
) {
  let entry = entries.get(userId);
  if (!entry) {
    entry = {
      channel: null,
      listeners: new Set(),
      live: false,
      everLive: false,
      stopped: false,
    };
    entries.set(userId, entry);
    open(userId, entry);
  }

  entry.listeners.add(listener);
  if (entry.live) listener.onLive?.("first");

  const current = entry;
  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;
    current.stopped = true;
    entries.delete(userId);
    if (!current.channel) return;
    const removal = createClient()
      .removeChannel(current.channel)
      .catch(() => undefined)
      .finally(() => {
        if (leaving.get(userId) === removal) leaving.delete(userId);
      });
    leaving.set(userId, removal);
  };
}
