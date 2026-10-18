import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import type { IceServer } from "@/features/video-call/lib/ice-servers";

export type CallRole = "patient" | "doctor";

export type ConnectionStatus =
  | "joining"
  | "waiting"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

export type MediaState = { micOn: boolean; camOn: boolean };

type Signal =
  | { kind: "description"; description: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit }
  | { kind: "media"; state: MediaState }
  | { kind: "bye" };

type IncomingSignal = Signal & { from: CallRole; session: string };

type Events = {
  onStatus: (status: ConnectionStatus) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onRemoteMedia: (state: MediaState) => void;
  onPeerLeft: () => void;
  onConnected: () => void;
  onJoinFailed: () => void;
};

type Options = {
  supabase: SupabaseClient;
  appointmentId: string;
  role: CallRole;
  iceServers: IceServer[];
  localStream: MediaStream;
  media: MediaState;
  events: Events;
};

// One side of a two-person WebRTC call. Supabase Realtime (a private channel,
// guarded by database policies) carries the setup messages; video and audio
// flow directly between the browsers.
//
// Uses the "perfect negotiation" pattern so either side can start or restart
// the connection without both offering at once: the patient is the polite
// peer and backs off on a collision, the doctor is impolite.
export class CallConnection {
  private channel: RealtimeChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private makingOffer = false;
  private ignoreOffer = false;
  private restartedIce = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private connectedOnce = false;
  private closed = false;
  private media: MediaState;
  // Identifies this tab. A refreshed tab gets a new id, which tells the
  // other side to drop the old connection instead of reusing it.
  private readonly sessionId = crypto.randomUUID();
  private remoteSessionId: string | null = null;

  constructor(private readonly options: Options) {
    this.media = options.media;
  }

  private get polite() {
    return this.options.role === "patient";
  }

  async join() {
    const { supabase, appointmentId, role, events } = this.options;

    // Private channels authorize with the user's access token.
    await supabase.realtime.setAuth();

    const channel = supabase.channel(`call:${appointmentId}`, {
      config: {
        private: true,
        broadcast: { self: false },
        presence: { key: role },
      },
    });
    this.channel = channel;

    channel
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        void this.handleSignal(payload as IncomingSignal);
      })
      .on("presence", { event: "sync" }, () => this.handlePresence())
      .subscribe(async (state) => {
        if (this.closed) return;
        if (state === "SUBSCRIBED") {
          await channel.track({ joinedAt: Date.now() });
          if (!this.pc) events.onStatus("waiting");
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          // Usually the call window closed, or the session expired.
          events.onJoinFailed();
        }
      });

    events.onStatus("joining");
  }

  setMedia(state: MediaState) {
    this.media = state;
    this.send({ kind: "media", state });
  }

  // Leave on purpose: tell the other side, then clean up.
  async leave() {
    if (this.closed) return;
    this.send({ kind: "bye" });
    this.closed = true;
    this.closePeer();
    if (this.channel) await this.options.supabase.removeChannel(this.channel);
    this.channel = null;
  }

  // Start over after a failure (for example a blocked network).
  retry() {
    this.closePeer();
    this.restartedIce = false;
    this.handlePresence();
  }

  private send(signal: Signal) {
    void this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: { ...signal, from: this.options.role, session: this.sessionId },
    });
  }

  private otherIsPresent() {
    const state = this.channel?.presenceState() ?? {};
    return Object.keys(state).some((key) => key !== this.options.role);
  }

  private handlePresence() {
    if (this.closed) return;
    if (this.otherIsPresent()) {
      this.ensurePeer();
    } else if (this.pc) {
      // They dropped or closed the tab without saying goodbye.
      this.closePeer();
      this.options.events.onStatus("waiting");
    }
  }

  private ensurePeer() {
    if (this.pc) return this.pc;

    const { iceServers, localStream, events } = this.options;
    const pc = new RTCPeerConnection({ iceServers });
    this.pc = pc;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.pendingCandidates = [];

    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }

    pc.ontrack = ({ streams, track }) => {
      events.onRemoteStream(streams[0] ?? new MediaStream([track]));
    };

    pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.send({
            kind: "description",
            description: pc.localDescription.toJSON(),
          });
        }
      } catch (error) {
        console.error("Call negotiation failed:", error);
      } finally {
        this.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate)
        this.send({ kind: "candidate", candidate: candidate.toJSON() });
    };

    pc.onconnectionstatechange = () => {
      if (this.pc !== pc || this.closed) return;
      switch (pc.connectionState) {
        case "connected":
          events.onStatus("connected");
          this.send({ kind: "media", state: this.media });
          if (!this.connectedOnce) {
            this.connectedOnce = true;
            events.onConnected();
          }
          break;
        case "disconnected":
          events.onStatus("reconnecting");
          break;
        case "failed":
          if (!this.restartedIce) {
            this.restartedIce = true;
            events.onStatus("reconnecting");
            pc.restartIce();
          } else {
            events.onStatus("failed");
          }
          break;
      }
    };

    events.onStatus("connecting");
    return pc;
  }

  private closePeer() {
    if (!this.pc) return;
    this.pc.ontrack = null;
    this.pc.onnegotiationneeded = null;
    this.pc.onicecandidate = null;
    this.pc.onconnectionstatechange = null;
    this.pc.close();
    this.pc = null;
    this.remoteSessionId = null;
    this.options.events.onRemoteStream(null);
  }

  private async handleSignal(signal: IncomingSignal) {
    if (this.closed || signal.from === this.options.role) return;

    // A goodbye from an old tab doesn't end the current connection.
    const stale =
      this.remoteSessionId !== null && signal.session !== this.remoteSessionId;
    if (signal.kind === "bye" && stale) return;

    if (signal.kind === "bye") {
      this.closePeer();
      this.options.events.onStatus("waiting");
      this.options.events.onPeerLeft();
      return;
    }

    if (signal.kind === "media") {
      this.options.events.onRemoteMedia(signal.state);
      return;
    }

    // Signals from a new tab replace the connection to the old one.
    if (stale) this.closePeer();
    const pc = this.ensurePeer();
    this.remoteSessionId = signal.session;
    try {
      if (signal.kind === "description") {
        const { description } = signal;
        const collision =
          description.type === "offer" &&
          (this.makingOffer || pc.signalingState !== "stable");
        this.ignoreOffer = !this.polite && collision;
        if (this.ignoreOffer) return;

        await pc.setRemoteDescription(description);
        await this.flushCandidates(pc);

        if (description.type === "offer") {
          await pc.setLocalDescription();
          if (pc.localDescription) {
            this.send({
              kind: "description",
              description: pc.localDescription.toJSON(),
            });
          }
        }
      } else if (signal.kind === "candidate") {
        // Candidates can arrive before the description they belong to.
        if (!pc.remoteDescription) {
          this.pendingCandidates.push(signal.candidate);
          return;
        }
        await this.addCandidate(pc, signal.candidate);
      }
    } catch (error) {
      console.error("Call signaling failed:", error);
    }
  }

  private async flushCandidates(pc: RTCPeerConnection) {
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) await this.addCandidate(pc, candidate);
  }

  private async addCandidate(
    pc: RTCPeerConnection,
    candidate: RTCIceCandidateInit,
  ) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      if (!this.ignoreOffer) throw error;
    }
  }
}
