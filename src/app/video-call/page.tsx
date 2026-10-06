import type { Metadata } from "next";

import { CallControls } from "@/features/video-call/components/call-controls";
import { VideoTile } from "@/features/video-call/components/video-tile";

export const metadata: Metadata = {
  title: "Video Call",
};

const connectionStatus = "Initializing...";

export default function VideoCallPage() {
  return (
    <div className="flex h-screen flex-col items-center bg-surface-call">
      <div>
        <p>{connectionStatus}</p>
        <p>00:00</p>
      </div>
      <div className="flex flex-1 gap-5 p-5">
        <VideoTile label="You" muted className="w-[180px]" />
        <VideoTile
          label="Waiting for connection..."
          controls
          className="w-[420px]"
        />
      </div>
      <div className="mb-2.5 bg-surface-status p-2 text-center">
        {connectionStatus}
      </div>
      <CallControls />
    </div>
  );
}
