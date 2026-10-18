import "server-only";

import { getTurnEnv } from "@/lib/env.server";

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

// Free public STUN servers let browsers find each other. A TURN relay is
// added only when its keys are set in the environment.
const PUBLIC_STUN: IceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export function getIceServers(): IceServer[] {
  const turn = getTurnEnv();
  if (!turn) return PUBLIC_STUN;

  return [
    ...PUBLIC_STUN,
    {
      urls: turn.TURN_URLS.split(",").map((url) => url.trim()),
      username: turn.TURN_USERNAME,
      credential: turn.TURN_CREDENTIAL,
    },
  ];
}
